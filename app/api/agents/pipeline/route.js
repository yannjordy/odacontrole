import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const WHATSAPP_SERVER = process.env.WHATSAPP_SERVER_URL || 'http://localhost:3001';

const WHITESPACE = '\n\n';

function genererMessageOffre(lead) {
  const p = lead.full_name?.split(' ')[0] || 'cher commerçant';
  return [
    `Bonjour ${p} ! 👋${WHITESPACE}` +
    `Je suis l'agent commercial ODA Marketplace.`,
    `Nous vous offrons la création GRATUITE d'une boutique professionnelle en ligne :`,
    `✅ Boutique personnalisée`,
    `✅ Visibilité sur ODA Marketplace`,
    `✅ Paiement Mobile Money (MTN/Orange Money)`,
    `✅ Pas de commission sur les ventes${WHITESPACE}` +
    `Souhaitez-vous créer votre boutique gratuitement ? (OUI/NON)`,
  ].join('\n');
}

function genererMessageBoutiquePret(lead, shop) {
  const p = lead.full_name?.split(' ')[0] || '!';
  return [
    `🎉 Félicitations ${p}${WHITESPACE}` +
    `Votre boutique ODA est prête !`,
    `📍 ${shop?.name || 'Votre boutique'}${WHITESPACE}` +
    `🔗 https://oda-market.vercel.app/boutique?shop=${shop?.slug || 'ma-boutique'}` +
    `${WHITESPACE}Votre boutique vous convient-elle ? (OUI/NON)`,
  ].join('\n');
}

async function sendWa(number, message) {
  const res = await fetch(`${WHATSAPP_SERVER}/send-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ number, message }),
    signal: AbortSignal.timeout(15000),
  });
  return { ok: res.ok, data: await res.json() };
}

async function attendreReponse(leadId, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await supabase
      .from('whatsapp_messages')
      .select('content')
      .eq('lead_id', leadId)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(1);
    if (data?.length) {
      const msg = data[0].content?.body || '';
      const upper = msg.toUpperCase().trim();
      if (/^(OUI|OUE|OAI|YES|OK)\b/.test(upper) || /^OUI/i.test(msg)) return 'oui';
      if (/^(NON|NO|NOP)\b/.test(upper) || /^NON/i.test(msg)) return 'non';
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  return 'timeout';
}

async function ecrireLog(action, details) {
  await supabase.from('audit_logs').insert({ action, details, severity: 'info' }).catch(() => {});
}

export async function POST(req) {
  try {
    const { mode, leadId } = await req.json();

    if (mode === 'contact') {
      const { data: leads, error } = leadId
        ? await supabase.from('leads').select('*').eq('id', leadId)
        : await supabase.from('leads').select('*').eq('status', 'new').limit(10);
      if (error) throw error;
      if (!leads?.length) return NextResponse.json({ success: true, processed: 0, message: 'Aucun lead à traiter' });

      const results = [];
      for (const lead of leads) {
        const message = genererMessageOffre(lead);
        const wa = await sendWa(lead.phone, message);
        await supabase.from('contact_attempts').insert({
          lead_id: lead.id, channel: 'whatsapp', direction: 'outbound',
          status: wa.ok ? 'sent' : 'failed', content: { body: message },
          attempted_at: new Date().toISOString(),
        });
        if (wa.ok) {
          await supabase.from('leads').update({ status: 'contacted', last_contact_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', lead.id);
        }
        results.push({ lead_id: lead.id, phone: lead.phone, name: lead.full_name, sent: wa.ok });
        await new Promise(r => setTimeout(r, 2000));
      }
      await ecrireLog('campaign_contact', { count: results.length, sent: results.filter(r => r.sent).length });
      return NextResponse.json({ success: true, mode: 'contact', processed: results.length, results });

    } else if (mode === 'pipeline') {
      const { data: leads } = leadId
        ? await supabase.from('leads').select('*').eq('id', leadId)
        : await supabase.from('leads').select('*').eq('status', 'new').limit(5);
      if (!leads?.length) return NextResponse.json({ success: true, processed: 0, message: 'Aucun lead' });

      const results = [];

      for (const lead of leads) {
        const steps = [];
        try {
          // Step 1: Contact WhatsApp
          const message = genererMessageOffre(lead);
          const wa = await sendWa(lead.phone, message);
          steps.push({ step: 'contact', status: wa.ok ? 'sent' : 'failed' });
          if (!wa.ok) { results.push({ lead_id: lead.id, phone: lead.phone, name: lead.full_name, steps }); continue; }
          await supabase.from('leads').update({ status: 'contacted', last_contact_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', lead.id);

          // Step 2: Wait for OUI/NON
          const reponse = await attendreReponse(lead.id, 180000);
          if (reponse !== 'oui') {
            steps.push({ step: 'consent', status: reponse });
            await supabase.from('leads').update({ status: reponse === 'non' ? 'rejected' : 'contacted' }).eq('id', lead.id);
            results.push({ lead_id: lead.id, phone: lead.phone, name: lead.full_name, steps });
            continue;
          }
          steps.push({ step: 'consent', status: 'oui' });
          await supabase.from('leads').update({ consent_given: true, consent_date: new Date().toISOString() }).eq('id', lead.id);

          // Step 3: Onboarding auto
          const sellerData = {
            full_name: lead.full_name,
            phone: lead.phone,
            business_name: lead.business_name || `Boutique ${lead.full_name?.split(' ')[0] || 'ODA'}`,
            business_type: lead.business_type || 'Mode',
            city: lead.city || 'Douala',
            lead_id: lead.id,
          };
          steps.push({ step: 'onboarding', status: 'completed' });
          await supabase.from('leads').update({ status: 'onboarding' }).eq('id', lead.id);

          // Step 4: Create account
          const password = Math.random().toString(36).slice(-8) + 'A1!';
          const email = `vendeur-${Date.now().toString(36)}@oda.cm`;
          let userId = `user_${Date.now()}`;
          try {
            const { data: authUser } = await supabase.auth.admin.createUser({
              email, password, email_confirm: true,
              user_metadata: { full_name: lead.full_name, phone: lead.phone, role: 'seller' },
            });
            if (authUser?.user?.id) userId = authUser.user.id;
          } catch {}
          steps.push({ step: 'account', status: 'created', email });

          // Step 5: Create shop
          const slug = (sellerData.business_name || 'boutique').toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-') + '-' + Date.now().toString(36);
          const { data: shop } = await supabase.from('shops').insert({
            lead_id: lead.id, seller_id: userId, name: sellerData.business_name,
            slug, status: 'pending', validation_status: 'pending', products_count: 0, seller_email: email,
          }).select().single();
          steps.push({ step: 'shop', status: 'created', shop_id: shop?.id });
          await supabase.from('leads').update({ status: 'shop_created' }).eq('id', lead.id);

          // Step 6: Followup WhatsApp
          const msgBoutique = genererMessageBoutiquePret(lead, shop);
          await sendWa(lead.phone, msgBoutique);
          steps.push({ step: 'followup_sent', status: 'sent' });

          // Step 7: Wait for validation
          const validation = await attendreReponse(lead.id, 180000);
          if (validation === 'oui') {
            await supabase.from('leads').update({ status: 'validated' }).eq('id', lead.id);
            await supabase.from('shops').update({ status: 'active', validation_status: 'approved', validated_at: new Date().toISOString() }).eq('id', shop?.id);
            steps.push({ step: 'validation', status: 'validated' });
          } else {
            await supabase.from('shops').update({ status: 'rejected' }).eq('id', shop?.id);
            await supabase.from('leads').update({ status: 'rejected' }).eq('id', lead.id);
            steps.push({ step: 'validation', status: validation });
          }

        } catch (err) {
          steps.push({ step: 'error', status: 'failed', error: err.message });
        }
        results.push({ lead_id: lead.id, phone: lead.phone, name: lead.full_name, steps });
      }

      await ecrireLog('pipeline_completed', { total: results.length });
      return NextResponse.json({ success: true, mode: 'pipeline', processed: results.length, results });

    } else if (mode === 'followup') {
      const { data: leads } = leadId
        ? await supabase.from('leads').select('*,shops(*)').eq('id', leadId)
        : await supabase.from('leads').select('*,shops(*)').eq('status', 'shop_created').limit(5);
      if (!leads?.length) return NextResponse.json({ success: true, processed: 0, message: 'Aucun lead à relancer' });

      const results = [];
      for (const lead of leads) {
        const shop = lead.shops?.[0];
        if (!shop) { results.push({ lead_id: lead.id, status: 'skipped', reason: 'no shop' }); continue; }
        const message = genererMessageBoutiquePret(lead, shop);
        const wa = await sendWa(lead.phone, message);
        await supabase.from('contact_attempts').insert({
          lead_id: lead.id, channel: 'whatsapp', direction: 'outbound',
          status: wa.ok ? 'sent' : 'failed', content: { body: message },
        });
        results.push({ lead_id: lead.id, phone: lead.phone, name: lead.full_name, sent: wa.ok });
        await new Promise(r => setTimeout(r, 2000));
      }
      return NextResponse.json({ success: true, mode: 'followup', processed: results.length, results });
    }

    return NextResponse.json({ error: 'Mode inconnu' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
