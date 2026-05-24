import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const WHATSAPP_SERVER = process.env.WHATSAPP_SERVER_URL || 'http://localhost:3001';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function sendWa(number, message) {
  const res = await fetch(`${WHATSAPP_SERVER}/send-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ number, message }),
    signal: AbortSignal.timeout(15000),
  });
  return { ok: res.ok, data: await res.json() };
}

function genererMessageLead(lead) {
  const prenom = lead.full_name?.split(' ')[0] || 'cher commerçant';
  return [
    `Bonjour ${prenom} ! 👋`,
    ``,
    `Je suis l'agent commercial ODA Marketplace.`,
    `Nous avons remarqué votre activité dans ${lead.city || 'le commerce au Cameroun'}.`,
    ``,
    `Nous vous offrons la création GRATUITE d'une boutique professionnelle en ligne sur ODA :`,
    `✅ Boutique personnalisée avec votre logo`,
    `✅ Vos produits visibles par des milliers d'acheteurs`,
    `✅ Paiement Mobile Money (MTN/Orange Money)`,
    `✅ Pas de commission sur les ventes`,
    ``,
    `Souhaitez-vous que nous créions votre boutique gratuitement ? (OUI/NON)`,
  ].join('\n');
}

export async function POST(req) {
  try {
    const { mode = 'contact', batchSize = 10 } = await req.json();

    const statusMap = {
      contact: 'new',
      followup: 'onboarding',
      marketing: 'validated',
    };

    const targetStatus = statusMap[mode] || 'new';

    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('status', targetStatus)
      .limit(batchSize);

    if (error) throw error;
    if (!leads?.length) {
      return NextResponse.json({ success: true, processed: 0, message: 'Aucun lead à traiter' });
    }

    const results = [];

    for (const lead of leads) {
      try {
        const message = genererMessageLead(lead);
        const waResult = await sendWa(lead.phone, message);

        await supabase.from('contact_attempts').insert({
          lead_id: lead.id,
          channel: 'whatsapp',
          direction: 'outbound',
          status: waResult.ok ? 'sent' : 'failed',
          content: { body: message },
          attempted_at: new Date().toISOString(),
        });

        if (waResult.ok) {
          await supabase
            .from('leads')
            .update({
              status: 'contacted',
              last_contact_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', lead.id);
        }

        results.push({
          lead_id: lead.id,
          phone: lead.phone,
          name: lead.full_name,
          sent: waResult.ok,
          error: waResult.ok ? null : waResult.data?.error,
        });
      } catch (err) {
        results.push({
          lead_id: lead.id,
          phone: lead.phone,
          name: lead.full_name,
          sent: false,
          error: err.message,
        });
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    return NextResponse.json({
      success: true,
      mode,
      processed: results.length,
      sent: results.filter(r => r.sent).length,
      failed: results.filter(r => !r.sent).length,
      results,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
