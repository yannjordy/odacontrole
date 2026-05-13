import { NextResponse } from 'next/server';
import { getAdminClient, verifierAdmin } from '@/lib/admin';

export async function GET(req) {
  try {
    const adminId = req.headers.get('x-admin-id');
    const role = await verifierAdmin(adminId);
    if (!role) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const admin = getAdminClient();

    if (action === 'stats') {
      const [produits, services, usersRes, commandes, signalements, boosts, abonnements] = await Promise.all([
        admin.from('produits').select('id,statut'),
        admin.from('services').select('id,statut'),
        admin.rpc('get_users_count'),
        admin.from('commandes').select('id,montant_total,statut,created_at'),
        admin.from('signalements').select('id,statut'),
        admin.from('boosts').select('id,total_a_payer,statut'),
        admin.from('abonnements').select('id,plan,statut'),
      ]);

      const { data: caAll } = await admin.from('commandes').select('montant_total');
      const { data: caMois } = await admin.from('commandes').select('montant_total')
        .gte('created_at', new Date(Date.now() - 30*86400000).toISOString());

      const ca = caAll?.reduce((s, c) => s + Number(c.montant_total||0), 0) || 0;
      const caM = caMois?.reduce((s, c) => s + Number(c.montant_total||0), 0) || 0;

      const cmdMois = commandes.data?.filter(c =>
        new Date(c.created_at) > new Date(Date.now() - 30*86400000)
      ).length||0;

      const abosActifs = abonnements.data?.filter(a => a.statut === 'actif').length||0;
      const boostsActifs = boosts.data?.filter(b => b.statut === 'actif').length||0;

      const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 10000 });
      const allUsers = usersList?.users || [];
      const newUsers30d = allUsers.filter(u =>
        new Date(u.created_at) > new Date(Date.now() - 30*86400000)
      ).length;

      return NextResponse.json({
        users: usersRes.data || 0,
        newUsers30d,
        abonnementsActifs: abosActifs,
        revenuAbonnementsMois: 0,
        produits: { total: produits.data?.length||0, publies: produits.data?.filter(p => p.statut === 'published').length||0 },
        services: { total: services.data?.length||0, actifs: services.data?.filter(s => s.statut === 'actif').length||0 },
        commandes: { total: commandes.data?.length||0, mois: cmdMois, ca, caMois: caM },
        signalements: signalements.data?.filter(s => s.statut === 'en_attente').length||0,
        boosts: { total: boosts.data?.length||0, actifs: boostsActifs },
      });
    }

    if (action === 'analytics') {
      const jours = parseInt(searchParams.get('jours')||'30');
      const since = new Date(Date.now() - jours*86400000).toISOString();

      const { data: { users: allUsers } } = await admin.auth.admin.listUsers({ perPage: 10000 });
      const joursData = {};
      for (let i = jours-1; i >= 0; i--) {
        const d = new Date(Date.now() - i*86400000).toISOString().split('T')[0];
        joursData[d] = 0;
      }
      (allUsers||[]).forEach(u => {
        const d = u.created_at?.split('T')[0];
        if (joursData[d] !== undefined) joursData[d]++;
      });
      const userGrowth = Object.entries(joursData).sort().map(([date, count]) => ({ value: count, label: date.slice(5) }));

      const { data: abos } = await admin.from('abonnements').select('plan,statut');
      const plans = { gratuit:0, basique:0, pro:0, illimité:0 };
      (abos||[]).filter(a => a.statut === 'actif').forEach(a => { plans[a.plan] = (plans[a.plan]||0)+1; });
      const subscriptionBreakdown = Object.entries(plans).filter(([_,v]) => v>0).map(([label, value]) => ({ label: label.charAt(0).toUpperCase()+label.slice(1), value }));

      const { data: commandes } = await admin.from('commandes').select('montant_total,created_at')
        .gte('created_at', since).order('created_at');
      const revJours = {};
      for (let i = jours-1; i >= 0; i--) {
        const d = new Date(Date.now() - i*86400000).toISOString().split('T')[0];
        revJours[d] = 0;
      }
      (commandes||[]).forEach(c => {
        const d = c.created_at?.split('T')[0];
        if (revJours[d] !== undefined) revJours[d] += Number(c.montant_total||0);
      });
      const revenueTimeline = Object.entries(revJours).sort().map(([date, val]) => ({ value: Math.round(val), label: date.slice(5) }));

      const convJours = {};
      for (let i = jours-1; i >= 0; i--) {
        const d = new Date(Date.now() - i*86400000).toISOString().split('T')[0];
        convJours[d] = 0;
      }
      const { data: abosHistory } = await admin.from('abonnements').select('created_at,statut');
      (abosHistory||[]).filter(a => a.statut === 'actif').forEach(a => {
        const d = a.created_at?.split('T')[0];
        if (convJours[d] !== undefined) convJours[d]++;
      });
      const conversionTimeline = Object.entries(convJours).sort().map(([date, count]) => ({ value: count, label: date.slice(5) }));

      return NextResponse.json({ userGrowth, subscriptionBreakdown, revenueTimeline, conversionTimeline });
    }

    if (action === 'users') {
      const page = parseInt(searchParams.get('page')||'1');
      const limit = 20;
      const fromAuth = await admin.auth.admin.listUsers({ page, perPage: limit });
      const users = fromAuth.data?.users || [];
      const userIds = users.map(u => u.id);
      const { data: abos } = await admin.from('abonnements').select('user_id,plan,statut').in('user_id', userIds);
      const { data: roles } = await admin.from('admin_roles').select('user_id,role').in('user_id', userIds);
      const { data: counts } = await admin.from('produits').select('user_id,id').in('user_id', userIds);
      const aboMap = Object.fromEntries((abos||[]).map(a => [a.user_id, a]));
      const roleMap = Object.fromEntries((roles||[]).map(r => [r.user_id, r]));
      const prodCounts = {}; (counts||[]).forEach(p => { prodCounts[p.user_id] = (prodCounts[p.user_id]||0)+1; });

      return NextResponse.json({
        users: users.map(u => ({
          id: u.id, email: u.email, nom: u.user_metadata?.display_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Inconnu',
          created_at: u.created_at, last_sign_in: u.last_sign_in_at, photo: u.user_metadata?.avatar_url || null,
          abonnement: aboMap[u.id]?.plan || 'gratuit', abonnementStatut: aboMap[u.id]?.statut || 'inactif',
          role: roleMap[u.id]?.role || null, produitsCount: prodCounts[u.id] || 0, banned: !!u.banned_until,
        })),
        total: fromAuth.data?.total || 0, page, totalPages: Math.ceil((fromAuth.data?.total||0)/limit),
      });
    }

    if (action === 'signalements') {
      const { data, count } = await admin.from('signalements').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(0, 49);
      return NextResponse.json({ signalements: data||[], total: count });
    }

    if (action === 'produits') {
      const page = parseInt(searchParams.get('page')||'1');
      const limit = 20;
      const search = searchParams.get('search')||'';
      let q = admin.from('produits').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (search) q = q.or(`nom.ilike.%${search}%,description.ilike.%${search}%`);
      const { data, count } = await q.range((page-1)*limit, page*limit-1);
      const uids = [...new Set((data||[]).map(p => p.user_id))];
      const userMap = {};
      if (uids.length) {
        const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 10000 });
        (users||[]).filter(u => uids.includes(u.id)).forEach(u => {
          userMap[u.id] = { email: u.email, nom: u.user_metadata?.display_name || u.user_metadata?.name || u.email?.split('@')[0] };
        });
      }
      return NextResponse.json({
        produits: (data||[]).map(p => ({ ...p, user: userMap[p.user_id]||null })),
        total: count||0, page, totalPages: Math.ceil((count||0)/limit),
      });
    }

    if (action === 'services') {
      const page = parseInt(searchParams.get('page')||'1');
      const limit = 20;
      const search = searchParams.get('search')||'';
      let q = admin.from('services').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (search) q = q.or(`nom.ilike.%${search}%,description.ilike.%${search}%`);
      const { data, count } = await q.range((page-1)*limit, page*limit-1);
      const uids = [...new Set((data||[]).map(s => s.user_id))];
      const userMap = {};
      if (uids.length) {
        const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 10000 });
        (users||[]).filter(u => uids.includes(u.id)).forEach(u => {
          userMap[u.id] = { email: u.email, nom: u.user_metadata?.display_name || u.user_metadata?.name || u.email?.split('@')[0] };
        });
      }
      return NextResponse.json({
        services: (data||[]).map(s => ({ ...s, user: userMap[s.user_id]||null })),
        total: count||0, page, totalPages: Math.ceil((count||0)/limit),
      });
    }

    if (action === 'commandes') {
      const page = parseInt(searchParams.get('page')||'1');
      const limit = 20;
      const search = searchParams.get('search')||'';
      let q = admin.from('commandes').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (search) q = q.or(`id.ilike.%${search}%`);
      const { data, count } = await q.range((page-1)*limit, page*limit-1);
      const ca = (data||[]).reduce((s, c) => s + Number(c.montant_total||0), 0);
      return NextResponse.json({
        commandes: data||[], total: count||0, ca,
        enCours: (data||[]).filter(c => c.statut==='en_cours'||c.statut==='en_attente').length,
        livrees: (data||[]).filter(c => c.statut==='livree'||c.statut==='payee').length,
        page, totalPages: Math.ceil((count||0)/limit),
      });
    }

    if (action === 'abonnements') {
      const { data: abos } = await admin.from('abonnements').select('*').order('created_at', { ascending: false });
      const actifs = (abos||[]).filter(a => a.statut === 'actif');
      const plans = { gratuit:0, basique:0, pro:0, illimité:0 };
      actifs.forEach(a => { plans[a.plan] = (plans[a.plan]||0)+1; });
      const breakdown = Object.entries(plans).filter(([_,v]) => v>0).map(([label, value]) => ({ label: label.charAt(0).toUpperCase()+label.slice(1), value }));
      const recent = (abos||[]).slice(0, 10);
      const uids = [...new Set(recent.map(a => a.user_id))];
      const userMap = {};
      if (uids.length) {
        const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 10000 });
        (users||[]).filter(u => uids.includes(u.id)).forEach(u => {
          userMap[u.id] = { email: u.email, nom: u.user_metadata?.display_name || u.user_metadata?.name || u.email?.split('@')[0] };
        });
      }
      const totalUsers = (await admin.auth.admin.listUsers({ perPage: 1 })).data?.total || 0;
      const tauxConversion = totalUsers > 0 ? ((actifs.length / totalUsers) * 100).toFixed(1) : '0';
      return NextResponse.json({
        stats: { actifs: actifs.length, tauxConversion, resiliations: (abos||[]).filter(a => a.statut!=='actif').length, revenuMensuel: 0 },
        breakdown, recent: recent.map(a => ({ ...a, user: userMap[a.user_id]||null })),
      });
    }

    if (action === 'visiteurs') {
      const jours = parseInt(searchParams.get('jours')||'7');
      const since = new Date(Date.now() - jours*86400000).toISOString();
      const { data } = await admin.from('visiteurs').select('id,timestamp,page').gte('timestamp', since).order('timestamp', { ascending: false });
      const joursData = {};
      for (let i = jours-1; i >= 0; i--) { const d = new Date(Date.now() - i*86400000).toISOString().split('T')[0]; joursData[d] = 0; }
      (data||[]).forEach(v => { const d = v.timestamp?.split('T')[0]; if (joursData[d] !== undefined) joursData[d]++; });
      const pages = {}; (data||[]).forEach(v => { pages[v.page||'/'] = (pages[v.page||'/']||0)+1; });
      return NextResponse.json({
        total: data?.length||0, visitsParJour: Object.entries(joursData).sort().map(([date, count]) => ({ date, count })),
        topPages: Object.entries(pages).sort((a,b) => b[1]-a[1]).slice(0,10).map(([page, count]) => ({ page, count })), jours,
      });
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const adminId = req.headers.get('x-admin-id');
    const role = await verifierAdmin(adminId);
    if (!role) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

    const body = await req.json();
    const { action } = body;
    const admin = getAdminClient();

    if (action === 'block_user') {
      await admin.auth.admin.updateUserById(body.userId, { ban_duration: '730d' });
      await log(admin, adminId, 'block_user', 'utilisateur', body.userId);
      return NextResponse.json({ success: true });
    }
    if (action === 'unblock_user') {
      await admin.auth.admin.updateUserById(body.userId, { ban_duration: 'none' });
      await log(admin, adminId, 'unblock_user', 'utilisateur', body.userId);
      return NextResponse.json({ success: true });
    }
    if (action === 'delete_user') {
      await admin.auth.admin.deleteUser(body.userId);
      await log(admin, adminId, 'delete_user', 'utilisateur', body.userId);
      return NextResponse.json({ success: true });
    }
    if (action === 'set_admin') {
      await admin.from('admin_roles').upsert({ user_id: body.userId, role: body.newRole, created_by: adminId }, { onConflict: 'user_id' });
      await log(admin, adminId, 'set_admin', 'admin_roles', body.userId, { role: body.newRole });
      return NextResponse.json({ success: true });
    }
    if (action === 'remove_admin') {
      await admin.from('admin_roles').delete().eq('user_id', body.userId);
      await log(admin, adminId, 'remove_admin', 'admin_roles', body.userId);
      return NextResponse.json({ success: true });
    }
    if (action === 'traiter_signalement') {
      await admin.from('signalements').update({ statut: body.statut, traite_par: adminId, traite_le: new Date().toISOString(), action_prise: body.actionPrise||'' }).eq('id', body.signalementId);
      await log(admin, adminId, 'traiter_signalement', 'signalement', body.signalementId, { statut: body.statut });
      return NextResponse.json({ success: true });
    }
    if (action === 'update_abonnement') {
      await admin.from('abonnements').upsert({ user_id: body.userId, plan: body.plan||'gratuit', limite_produits: body.limiteProduits||10, statut: 'actif' }, { onConflict: 'user_id' });
      await log(admin, adminId, 'update_abonnement', 'utilisateur', body.userId, { plan: body.plan });
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_produit') {
      await admin.from('produits').delete().eq('id', body.produitId);
      await log(admin, adminId, 'delete_produit', 'produit', body.produitId);
      return NextResponse.json({ success: true });
    }

    if (action === 'update_produit_status') {
      await admin.from('produits').update({ statut: body.statut }).eq('id', body.produitId);
      await log(admin, adminId, 'update_produit_status', 'produit', body.produitId, { statut: body.statut });
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_service') {
      await admin.from('services').delete().eq('id', body.serviceId);
      await log(admin, adminId, 'delete_service', 'service', body.serviceId);
      return NextResponse.json({ success: true });
    }

    if (action === 'update_service_status') {
      await admin.from('services').update({ statut: body.statut }).eq('id', body.serviceId);
      await log(admin, adminId, 'update_service_status', 'service', body.serviceId, { statut: body.statut });
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_commande') {
      await admin.from('commandes').delete().eq('id', body.commandeId);
      await log(admin, adminId, 'delete_commande', 'commande', body.commandeId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function log(admin, adminId, action, targetType, targetId, details = {}) {
  try { await admin.from('admin_logs').insert({ admin_id: adminId, action, target_type: targetType, target_id: targetId, details }); } catch {}
}
