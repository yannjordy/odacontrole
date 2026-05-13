'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CSS = `
  .adw{padding:24px;max-width:1400px;margin:0 auto}
  @media(max-width:768px){.adw{padding:12px}}
  .adh{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}
  .adh h1{font-size:1.5rem;font-weight:700;display:flex;align-items:center;gap:10px;margin:0}
  .adb{display:inline-flex;align-items:center;gap:4px;padding:4px 12px;border-radius:20px;font-size:.72rem;font-weight:600}
  .adb.super_admin{background:#1a1a2e;color:white}
  .adb.admin{background:#007AFF;color:white}
  .adb.moderator{background:#FF9500;color:white}

  .adt{display:flex;gap:6px;margin-bottom:20px;overflow-x:auto;scrollbar-width:none}
  .adt::-webkit-scrollbar{display:none}
  .adtab{padding:9px 18px;border-radius:10px;border:none;font-size:.82rem;font-weight:600;cursor:pointer;white-space:nowrap;transition:all .18s;font-family:inherit;background:white;color:#666;box-shadow:0 1px 3px rgba(0,0,0,.06)}
  .adtab:hover{background:#f0f0f0}
  .adtab.active{background:#1a1a2e;color:white;box-shadow:0 4px 12px rgba(26,26,46,.25)}

  .adg{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:24px}
  .adc{background:white;border-radius:14px;padding:18px 20px;box-shadow:0 2px 8px rgba(0,0,0,.06);animation:fIn .3s ease both;border:1px solid #f0f0f0}
  .adcl{font-size:.72rem;font-weight:600;color:#8e8e93;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
  .adcv{font-size:1.6rem;font-weight:800;color:#1a1a1a;line-height:1.2}
  .adcs{font-size:.72rem;color:#34C759;font-weight:600;margin-top:2px}
  .adci{float:right;font-size:1.4rem;opacity:.15}
  .adc.red .adcv{color:#FF3B30}

  .adsec{margin-bottom:20px}
  .adst{font-size:1rem;font-weight:700;margin:0 0 4px}
  .adsd{font-size:.78rem;color:#8e8e93;margin-bottom:12px}

  .adtw{overflow-x:auto;background:white;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.06);border:1px solid #f0f0f0}
  .adtabl{width:100%;border-collapse:collapse;font-size:.82rem}
  .adtabl th{text-align:left;padding:12px 14px;font-weight:600;color:#8e8e93;font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #f0f0f0;background:#fafafa;white-space:nowrap}
  .adtabl td{padding:10px 14px;border-bottom:1px solid #f5f5f5;color:#333;vertical-align:middle}
  .adtabl tr:hover td{background:#f8f9fd}
  .adtabl tr:last-child td{border-bottom:none}

  .adav{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#007AFF,#5856D6);display:flex;align-items:center;justify-content:center;color:white;font-size:.7rem;font-weight:700;flex-shrink:0}
  .adav img{width:100%;height:100%;border-radius:50%;object-fit:cover}

  .adbtn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:8px;border:none;font-size:.75rem;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit}
  .adbtn:active{transform:scale(.95)}
  .adbtn-sm{padding:4px 8px;font-size:.68rem}
  .adbtn-danger{background:#FF3B30;color:white}
  .adbtn-danger:hover{background:#dc3545}
  .adbtn-warning{background:#FF9500;color:white}
  .adbtn-success{background:#34C759;color:white}
  .adbtn-primary{background:#007AFF;color:white}
  .adbtn-ghost{background:transparent;color:#666;border:1px solid #e0e0e0}
  .adbtn-ghost:hover{background:#f5f5f5}

  .adpill{display:inline-flex;padding:2px 10px;border-radius:12px;font-size:.68rem;font-weight:600}
  .adpill.actif{background:#34C759;color:white}
  .adpill.inactif{background:#8e8e93;color:white}
  .adpill.en_attente{background:#FF9500;color:white}
  .adpill.resolu{background:#34C759;color:white}
  .adpill.rejete{background:#8e8e93;color:white}
  .adpill.banned{background:#FF3B30;color:white}

  .adsrch{width:100%;max-width:320px;padding:9px 14px;border-radius:10px;border:1.5px solid #e0e0e0;font-size:.82rem;outline:none;transition:border-color .2s;font-family:inherit;background:white;box-sizing:border-box}
  .adsrch:focus{border-color:#007AFF;box-shadow:0 0 0 3px rgba(0,122,255,.1)}

  .admb{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;animation:fIn .15s ease}
  .admcont{background:white;border-radius:16px;width:100%;max-width:480px;max-height:80vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2)}
  .admhead{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #f0f0f0}
  .admtitle{font-size:.95rem;font-weight:700;color:#1a1a1a}
  .admclose{width:28px;height:28px;border:none;border-radius:50%;background:#f0f0f0;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#666}
  .admbody{padding:16px 20px;overflow-y:auto;flex:1}
  .admact{display:flex;gap:8px;justify-content:flex-end;padding:12px 20px;border-top:1px solid #f0f0f0}

  .adchart{display:flex;align-items:flex-end;gap:3px;height:100px}
  .adcol{flex:1;border-radius:4px 4px 0 0;min-height:2px;transition:height .6s ease}
  .adlbl{font-size:.6rem;color:#8e8e93;text-align:center;margin-top:4px}

  .adld{display:flex;align-items:center;justify-content:center;min-height:60vh;flex-direction:column;gap:12px;color:#8e8e93}
  .adsp{width:28px;height:28px;border:2.5px solid #e0e0e0;border-top-color:#007AFF;border-radius:50%;animation:spin .7s linear infinite}

  .adem{text-align:center;padding:40px 20px;color:#8e8e93}
  .ademi{font-size:2.5rem;margin-bottom:8px}
  .ademt{font-size:1rem;font-weight:600;color:#333;margin:0 0 4px}
  .ademd{font-size:.82rem;color:#8e8e93;margin:0}

  .adpag{display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 0}
  .adpbtn{padding:6px 12px;border-radius:8px;border:1px solid #e0e0e0;background:white;font-size:.78rem;font-weight:500;cursor:pointer;color:#333;font-family:inherit}
  .adpbtn:hover{background:#f5f5f5}
  .adpbtn:disabled{opacity:.4;cursor:not-allowed}

  .adtoast{position:fixed;bottom:24px;right:24px;z-index:99999;padding:12px 20px;border-radius:12px;font-size:.82rem;font-weight:600;color:white;box-shadow:0 8px 24px rgba(0,0,0,.15);animation:fIn .2s ease;cursor:pointer}
  .adtoast.success{background:#34C759}
  .adtoast.error{background:#FF3B30}
  .adtoast.info{background:#007AFF}

  .adlogout{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:1.5px solid #e0e0e0;background:white;font-size:.8rem;font-weight:500;cursor:pointer;color:#666;transition:all .15s;font-family:inherit}
  .adlogout:hover{border-color:#FF3B30;color:#FF3B30;background:#fff5f5}
`;

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState('dashboard');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined' && !document.getElementById('adw-css')) {
      const s = document.createElement('style'); s.id = 'adw-css'; s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/connexion'); return; }
      setUser(session.user);
      checkAdmin(session.user.id);
    });
  }, [router]);

  async function checkAdmin(uid) {
    try {
      const { data: d } = await supabase.from('admin_roles').select('role').eq('user_id', uid).single();
      if (!d) { setRole(false); setChecking(false); return; }
      setRole(d.role);
    } catch { setRole(false); }
    setChecking(false);
  }

  useEffect(() => { if (role) fetchData(); }, [tab, role, page]);

  async function api(method, body = {}, params = {}) {
    const qs = new URLSearchParams({ ...params, _t: Date.now() }).toString();
    const res = await fetch(`/api/admin?${qs}`, {
      method, headers: { 'Content-Type': 'application/json', 'x-admin-id': user?.id },
      body: method === 'POST' ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }

  async function fetchData() {
    setLoading(true);
    try {
      if (tab === 'dashboard') setData(prev => ({ ...prev, stats: await api('GET', {}, { action: 'stats' }) }));
      else if (tab === 'produits') setData(prev => ({ ...prev, produitsData: await api('GET', {}, { action: 'produits', page: String(page), search }) }));
      else if (tab === 'services') setData(prev => ({ ...prev, servicesData: await api('GET', {}, { action: 'services', page: String(page), search }) }));
      else if (tab === 'users') setData(prev => ({ ...prev, users: await api('GET', {}, { action: 'users', page: String(page) }) }));
      else if (tab === 'signalements') setData(prev => ({ ...prev, signalements: await api('GET', {}, { action: 'signalements' }) }));
      else if (tab === 'traffic') setData(prev => ({ ...prev, visiteurs: await api('GET', {}, { action: 'visiteurs', jours: String(data.jours||7) }) }));
    } catch (e) { showToast('Erreur', 'error'); }
    setLoading(false);
  }

  async function exec(action, payload) {
    try {
      const res = await api('POST', { action, ...payload });
      if (res.success) { showToast('Action effectuée'); setModal(null); fetchData(); }
      else showToast(res.error||'Erreur', 'error');
    } catch { showToast('Erreur réseau', 'error'); }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push('/connexion');
  }

  if (checking) return <div className="adld"><div className="adsp" /><span>Vérification…</span></div>;
  if (role === false) return <div className="adld"><div style={{fontSize:'3rem'}}>🔒</div><h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#333',margin:0}}>Accès restreint</h2><p style={{color:'#8e8e93',fontSize:'.85rem'}}>Vous n&apos;avez pas les droits d&apos;administration.</p></div>;

  const TABS = [
    { id:'dashboard', label:'📊', text:'Vue d\'ensemble' },
    { id:'produits', label:'📦', text:'Produits' },
    { id:'services', label:'🛎️', text:'Services' },
    { id:'users', label:'👥', text:'Utilisateurs' },
    { id:'signalements', label:'🚩', text:'Signalements' },
    { id:'traffic', label:'📈', text:'Trafic' },
  ];

  const ROLES_MAP = { super_admin:'Super Admin', admin:'Admin', moderator:'Modérateur', support:'Support' };

  return (
    <div className="adw">
      <div className="adh">
        <div>
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            ODA Contrôle
            <span className={`adb ${role}`}>{ROLES_MAP[role]||role}</span>
          </h1>
          <div style={{fontSize:'.82rem',color:'#8e8e93'}}>Tour de contrôle — {user?.email}</div>
        </div>
        <button className="adlogout" onClick={logout}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Déconnexion
        </button>
      </div>

      <div className="adt">
        {TABS.map(t => (
          <button key={t.id} className={`adtab${tab===t.id?' active':''}`} onClick={() => { setTab(t.id); setPage(1); }}>{t.label} {t.text}</button>
        ))}
      </div>

      {/* DASHBOARD */}
      {tab === 'dashboard' && (loading ? <div className="adld"><div className="adsp" /></div> : (
        <>
          <div className="adg">
            <div className="adc"><div className="adci">👥</div><div className="adcl">Utilisateurs</div><div className="adcv">{data.stats?.users||0}</div></div>
            <div className="adc"><div className="adci">📦</div><div className="adcl">Produits</div><div className="adcv">{data.stats?.produits?.total||0}</div><div className="adcs">{data.stats?.produits?.publies||0} publiés</div></div>
            <div className="adc"><div className="adci">🛎️</div><div className="adcl">Services</div><div className="adcv">{data.stats?.services?.total||0}</div><div className="adcs">{data.stats?.services?.actifs||0} actifs</div></div>
            <div className="adc"><div className="adci">📋</div><div className="adcl">Commandes</div><div className="adcv">{data.stats?.commandes?.total||0}</div></div>
            <div className="adc"><div className="adci">💰</div><div className="adcl">CA total</div><div className="adcv">{(data.stats?.commandes?.ca||0).toLocaleString('fr-FR')} F</div><div className="adcs">+{(data.stats?.commandes?.caMois||0).toLocaleString('fr-FR')} F / 30j</div></div>
            <div className={`adc${(data.stats?.signalements||0)>0?' red':''}`}><div className="adci">🚩</div><div className="adcl">Signalements</div><div className="adcv">{data.stats?.signalements||0}</div><div className="adcs">en attente</div></div>
            <div className="adc"><div className="adci">📢</div><div className="adcl">Boosts</div><div className="adcv">{data.stats?.boosts?.total||0}</div></div>
          </div>
          {(data.stats?.signalements||0)>0 && (
            <div style={{background:'#fff5f5',border:'1px solid #FF3B30',borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
              <span style={{fontSize:'1.5rem'}}>🚩</span>
              <div><div style={{fontWeight:700,fontSize:'.85rem',color:'#FF3B30'}}>{data.stats.signalements} signalement(s) en attente</div></div>
              <button className="adbtn adbtn-danger adbtn-sm" style={{marginLeft:'auto'}} onClick={() => setTab('signalements')}>Voir</button>
            </div>
          )}
        </>
      ))}

      {/* USERS */}
      {tab === 'users' && (
        <div className="adsec">
          <h3 className="adst">Gestion des utilisateurs</h3>
          <p className="adsd">Liste de tous les comptes. Bloquer, attribuer un rôle admin, modifier l'abonnement.</p>
          <div style={{marginBottom:12,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
            <input className="adsrch" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {loading ? <div className="adld"><div className="adsp" /></div> : (
            <div className="adtw">
              <table className="adtabl">
                <thead><tr><th>Utilisateur</th><th>Email</th><th>Rôle</th><th>Abonnement</th><th>Produits</th><th>Inscrit</th><th>Actions</th></tr></thead>
                <tbody>
                  {data.users?.users?.filter(u => !search||u.email?.toLowerCase().includes(search.toLowerCase())||u.nom?.toLowerCase().includes(search.toLowerCase())).map(u => (
                    <tr key={u.id}>
                      <td><div style={{display:'flex',alignItems:'center',gap:8}}><div className="adav">{u.photo?<img src={u.photo} alt=""/>:u.nom?.charAt(0)?.toUpperCase()||'?'}</div><span style={{fontWeight:600}}>{u.nom}</span>{u.banned&&<span className="adpill banned">Bloqué</span>}</div></td>
                      <td style={{fontSize:'.78rem',color:'#666'}}>{u.email}</td>
                      <td>{u.role?<span className={`adb ${u.role}`}>{ROLES_MAP[u.role]}</span>:<span style={{color:'#aaa',fontSize:'.75rem'}}>—</span>}</td>
                      <td><span className={`adpill ${u.abonnementStatut==='actif'?'actif':'inactif'}`}>{u.abonnement}</span></td>
                      <td style={{textAlign:'center'}}>{u.produitsCount}</td>
                      <td style={{fontSize:'.72rem',color:'#8e8e93'}}>{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                          {!u.banned&&role==='super_admin'&&<button className="adbtn adbtn-danger adbtn-sm" onClick={()=>setModal({type:'block',user:u})}>Bloquer</button>}
                          {u.banned&&<button className="adbtn adbtn-success adbtn-sm" onClick={()=>exec('unblock_user',{userId:u.id})}>Débloquer</button>}
                          {role==='super_admin'&&<button className="adbtn adbtn-warning adbtn-sm" onClick={()=>setModal({type:'admin_role',user:u})}>Rôle</button>}
                          {role==='super_admin'&&<button className="adbtn adbtn-warning adbtn-sm" onClick={()=>setModal({type:'abonnement',user:u})}>Abonnement</button>}
                          {role==='super_admin'&&<button className="adbtn adbtn-danger adbtn-sm" onClick={()=>setModal({type:'delete',user:u})}>Suppr.</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="adpag">
                <button className="adpbtn" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>←</button>
                <span style={{fontSize:'.78rem',color:'#8e8e93'}}>Page {page} / {data.users?.totalPages||1}</span>
                <button className="adpbtn" disabled={page>=(data.users?.totalPages||1)} onClick={()=>setPage(p=>p+1)}>→</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SIGNALEMENTS */}
      {tab === 'signalements' && (
        <div className="adsec">
          <h3 className="adst">Signalements</h3>
          <p className="adsd">Contenus signalés par les utilisateurs.</p>
          {loading?<div className="adld"><div className="adsp"/></div>:(
            <div className="adtw">
              <table className="adtabl">
                <thead><tr><th>Type</th><th>Cible</th><th>Raison</th><th>Statut</th><th>Date</th><th>Action</th></tr></thead>
                <tbody>
                  {(data.signalements?.signalements||[]).map(s=>(
                    <tr key={s.id}>
                      <td><span className={`adpill ${s.type}`}>{s.type}</span></td>
                      <td style={{fontSize:'.78rem',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.target_id}</td>
                      <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.raison}</td>
                      <td><span className={`adpill ${s.statut}`}>{s.statut}</span></td>
                      <td style={{fontSize:'.72rem',color:'#8e8e93'}}>{new Date(s.created_at).toLocaleDateString('fr-FR')}</td>
                      <td>{s.statut==='en_attente'?<div style={{display:'flex',gap:4}}><button className="adbtn adbtn-success adbtn-sm" onClick={()=>exec('traiter_signalement',{signalementId:s.id,statut:'resolu',actionPrise:'Aucune action'})}>✅ Approuver</button><button className="adbtn adbtn-danger adbtn-sm" onClick={()=>exec('traiter_signalement',{signalementId:s.id,statut:'rejete',actionPrise:'Rejeté'})}>❌ Rejeter</button></div>:<span style={{fontSize:'.72rem',color:'#8e8e93'}}>Traité</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!data.signalements?.signalements||data.signalements.signalements.length===0)&&<div className="adem"><div className="ademi">✅</div><h4 className="ademt">Aucun signalement</h4><p className="ademd">Tout est calme</p></div>}
            </div>
          )}
        </div>
      )}

      {/* PRODUITS */}
      {tab === 'produits' && (
        <div className="adsec">
          <h3 className="adst">Gestion des produits</h3>
          <p className="adsd">Tous les produits publiés sur la marketplace.</p>
          <div style={{marginBottom:12,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
            <input className="adsrch" placeholder="Rechercher un produit…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {loading ? <div className="adld"><div className="adsp" /></div> : (
            <div className="adtw">
              <table className="adtabl">
                <thead><tr><th>Produit</th><th>Prix</th><th>Vendeur</th><th>Statut</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {(data.produitsData?.produits||[]).map(p => (
                    <tr key={p.id}>
                      <td style={{fontWeight:600,maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.nom}</td>
                      <td>{(p.prix||0).toLocaleString('fr-FR')} F</td>
                      <td style={{fontSize:'.78rem',color:'#666'}}>{p.user?.email||p.user_id?.slice(0,8)}</td>
                      <td><span className={`adpill ${p.statut==='published'?'actif':p.statut==='draft'?'inactif':p.statut==='suspended'?'banned':'inactif'}`}>{p.statut}</span></td>
                      <td style={{fontSize:'.72rem',color:'#8e8e93'}}>{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <div style={{display:'flex',gap:4}}>
                          <button className="adbtn adbtn-warning adbtn-sm" onClick={()=>setModal({type:'produit_statut',item:p})}>Statut</button>
                          <button className="adbtn adbtn-danger adbtn-sm" onClick={()=>setModal({type:'delete_produit',item:p})}>Suppr.</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!data.produitsData?.produits||data.produitsData.produits.length===0)&&<div className="adem"><div className="ademi">📦</div><h4 className="ademt">Aucun produit</h4><p className="ademd">Aucun produit trouvé</p></div>}
              <div className="adpag">
                <button className="adpbtn" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>←</button>
                <span style={{fontSize:'.78rem',color:'#8e8e93'}}>Page {page} / {data.produitsData?.totalPages||1}</span>
                <button className="adpbtn" disabled={page>=(data.produitsData?.totalPages||1)} onClick={()=>setPage(p=>p+1)}>→</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SERVICES */}
      {tab === 'services' && (
        <div className="adsec">
          <h3 className="adst">Gestion des services</h3>
          <p className="adsd">Tous les services proposés sur la marketplace.</p>
          <div style={{marginBottom:12,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
            <input className="adsrch" placeholder="Rechercher un service…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {loading ? <div className="adld"><div className="adsp" /></div> : (
            <div className="adtw">
              <table className="adtabl">
                <thead><tr><th>Service</th><th>Prix</th><th>Vendeur</th><th>Statut</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {(data.servicesData?.services||[]).map(s => (
                    <tr key={s.id}>
                      <td style={{fontWeight:600,maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.nom}</td>
                      <td>{(s.prix||0).toLocaleString('fr-FR')} F</td>
                      <td style={{fontSize:'.78rem',color:'#666'}}>{s.user?.email||s.user_id?.slice(0,8)}</td>
                      <td><span className={`adpill ${s.statut==='actif'?'actif':s.statut==='inactif'?'inactif':'banned'}`}>{s.statut}</span></td>
                      <td style={{fontSize:'.72rem',color:'#8e8e93'}}>{new Date(s.created_at).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <div style={{display:'flex',gap:4}}>
                          <button className="adbtn adbtn-warning adbtn-sm" onClick={()=>setModal({type:'service_statut',item:s})}>Statut</button>
                          <button className="adbtn adbtn-danger adbtn-sm" onClick={()=>setModal({type:'delete_service',item:s})}>Suppr.</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!data.servicesData?.services||data.servicesData.services.length===0)&&<div className="adem"><div className="ademi">🛎️</div><h4 className="ademt">Aucun service</h4><p className="ademd">Aucun service trouvé</p></div>}
              <div className="adpag">
                <button className="adpbtn" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>←</button>
                <span style={{fontSize:'.78rem',color:'#8e8e93'}}>Page {page} / {data.servicesData?.totalPages||1}</span>
                <button className="adpbtn" disabled={page>=(data.servicesData?.totalPages||1)} onClick={()=>setPage(p=>p+1)}>→</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TRAFFIC */}
      {tab === 'traffic' && (
        <div className="adsec">
          <h3 className="adst">Analyse du trafic</h3>
          <p className="adsd">Visites sur les boutiques et pages.</p>
          <div style={{display:'flex',gap:8,marginBottom:14}}>
            {[7,30,90].map(j => (
              <button key={j} className={`adbtn adbtn-sm ${(data.jours||7)===j?'adbtn-primary':'adbtn-ghost'}`}
                onClick={()=>{setData(prev=>({...prev,jours:j}));setTimeout(fetchData,100)}}>{j} jours</button>
            ))}
          </div>
          {loading?<div className="adld"><div className="adsp"/></div>:(
            <>
              <div className="adg" style={{gridTemplateColumns:'1fr 1fr'}}>
                <div className="adc"><div className="adcl">Visites totales</div><div className="adcv">{data.visiteurs?.total||0}</div></div>
                <div className="adc"><div className="adcl">Période</div><div className="adcv" style={{fontSize:'1rem'}}>{data.jours||7} jours</div></div>
              </div>
              <div className="adc" style={{marginBottom:16}}>
                <div className="adcl" style={{marginBottom:12}}>Visites par jour</div>
                {data.visiteurs?.visitsParJour?.length>0?(
                  <div className="adchart">
                    {(()=>{const max=Math.max(...data.visiteurs.visitsParJour.map(v=>v.count),1);return data.visiteurs.visitsParJour.map((v,i)=>(
                      <div key={i} className="adcol" style={{height:`${Math.max((v.count/max)*100,2)}%`,background:'linear-gradient(180deg,#007AFF,#5856D6)'}} title={`${v.date}:${v.count}`}>
                        <div className="adlbl">{v.date?.slice(5)}</div>
                      </div>
                    ))})()}
                  </div>
                ):<div className="adem" style={{padding:20}}><div className="ademt" style={{fontSize:'.85rem'}}>Aucune donnée</div></div>}
              </div>
              <div className="adc">
                <div className="adcl" style={{marginBottom:8}}>Pages les plus visitées</div>
                {data.visiteurs?.topPages?.length>0?(
                  <div className="adtw" style={{boxShadow:'none',border:'none'}}>
                    <table className="adtabl"><thead><tr><th>Page</th><th>Visites</th></tr></thead>
                      <tbody>{data.visiteurs.topPages.map((p,i)=>(
                        <tr key={i}><td style={{fontWeight:500}}>{p.page}</td><td><strong>{p.count}</strong></td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                ):<div className="adem" style={{padding:20}}><div className="ademt" style={{fontSize:'.85rem'}}>Aucune donnée</div></div>}
              </div>
            </>
          )}
        </div>
      )}

      {/* BLOCK MODAL */}
      {modal?.type==='block'&&(
        <div className="admb" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div className="admcont">
            <div className="admhead"><span className="admtitle">Bloquer l'utilisateur</span><button className="admclose" onClick={()=>setModal(null)}>✕</button></div>
            <div className="admbody"><p style={{fontSize:'.85rem',color:'#666',lineHeight:1.6}}>Bloquer <strong>{modal.user.nom}</strong> ({modal.user.email}) ? Il ne pourra plus se connecter pendant 2 ans.</p></div>
            <div className="admact"><button className="adbtn adbtn-ghost" onClick={()=>setModal(null)}>Annuler</button><button className="adbtn adbtn-danger" onClick={()=>exec('block_user',{userId:modal.user.id})}>Bloquer</button></div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {modal?.type==='delete'&&(
        <div className="admb" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div className="admcont">
            <div className="admhead"><span className="admtitle">Supprimer l'utilisateur</span><button className="admclose" onClick={()=>setModal(null)}>✕</button></div>
            <div className="admbody"><p style={{fontSize:'.85rem',color:'#FF3B30',lineHeight:1.6,fontWeight:600}}>⚠️ Action irréversible !</p><p style={{fontSize:'.85rem',color:'#666',lineHeight:1.6}}>Toutes les données de <strong>{modal.user.nom}</strong> seront supprimées.</p></div>
            <div className="admact"><button className="adbtn adbtn-ghost" onClick={()=>setModal(null)}>Annuler</button><button className="adbtn adbtn-danger" onClick={()=>exec('delete_user',{userId:modal.user.id})}>Supprimer</button></div>
          </div>
        </div>
      )}

      {/* ROLE MODAL */}
      {modal?.type==='admin_role'&&(
        <div className="admb" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div className="admcont">
            <div className="admhead"><span className="admtitle">Attribuer un rôle</span><button className="admclose" onClick={()=>setModal(null)}>✕</button></div>
            <div className="admbody">
              <p style={{fontSize:'.82rem',color:'#666',marginBottom:12}}>Utilisateur : <strong>{modal.user.nom}</strong></p>
              {['super_admin','admin','moderator','support'].map(r=>(
                <button key={r} className="adbtn adbtn-ghost" style={{justifyContent:'flex-start',padding:'10px 14px',fontSize:'.82rem',width:'100%',marginBottom:4}}
                  onClick={()=>exec('set_admin',{userId:modal.user.id,newRole:r})}>
                  <span className={`adb ${r}`} style={{marginRight:8,minWidth:60,justifyContent:'center'}}>{ROLES_MAP[r]}</span>
                  {r==='super_admin'?'Accès complet':r==='admin'?'Gestion utilisateurs':r==='moderator'?'Modération':'Support'}
                </button>
              ))}
              {modal.user.role&&<button className="adbtn adbtn-danger adbtn-sm" style={{marginTop:8,width:'100%',justifyContent:'center'}} onClick={()=>exec('remove_admin',{userId:modal.user.id})}>Retirer les droits admin</button>}
            </div>
          </div>
        </div>
      )}

      {/* ABONNEMENT MODAL */}
      {modal?.type==='abonnement'&&(
        <div className="admb" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div className="admcont">
            <div className="admhead"><span className="admtitle">Abonnement</span><button className="admclose" onClick={()=>setModal(null)}>✕</button></div>
            <div className="admbody">
              <p style={{fontSize:'.82rem',color:'#666',marginBottom:12}}><strong>{modal.user.nom}</strong> — actuel : {modal.user.abonnement}</p>
              {[{plan:'gratuit',limite:10,label:'Gratuit — 10'},{plan:'basique',limite:50,label:'Basique — 50'},{plan:'pro',limite:200,label:'Pro — 200'},{plan:'illimité',limite:9999,label:'Illimité'}].map(o=>(
                <button key={o.plan} className="adbtn adbtn-ghost" style={{justifyContent:'flex-start',padding:'10px 14px',fontSize:'.82rem',width:'100%',marginBottom:4}}
                  onClick={()=>exec('update_abonnement',{userId:modal.user.id,plan:o.plan,limiteProduits:o.limite})}>{o.label} produits</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PRODUIT STATUS MODAL */}
      {modal?.type==='produit_statut'&&(
        <div className="admb" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div className="admcont">
            <div className="admhead"><span className="admtitle">Changer le statut</span><button className="admclose" onClick={()=>setModal(null)}>✕</button></div>
            <div className="admbody">
              <p style={{fontSize:'.82rem',color:'#666',marginBottom:12}}>Produit : <strong>{modal.item.nom}</strong> — actuel : {modal.item.statut}</p>
              {['published','draft','archived','suspended'].map(st => (
                <button key={st} className="adbtn adbtn-ghost" style={{justifyContent:'flex-start',padding:'10px 14px',fontSize:'.82rem',width:'100%',marginBottom:4}}
                  onClick={()=>exec('update_produit_status',{produitId:modal.item.id,statut:st})}>
                  <span className={`adpill ${st==='published'?'actif':st==='suspended'?'banned':'inactif'}`} style={{marginRight:8,minWidth:70,justifyContent:'center'}}>{st}</span>
                  {st==='published'?'Publié':st==='draft'?'Brouillon':st==='archived'?'Archivé':'Suspendu'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DELETE PRODUIT MODAL */}
      {modal?.type==='delete_produit'&&(
        <div className="admb" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div className="admcont">
            <div className="admhead"><span className="admtitle">Supprimer le produit</span><button className="admclose" onClick={()=>setModal(null)}>✕</button></div>
            <div className="admbody">
              <p style={{fontSize:'.85rem',color:'#FF3B30',lineHeight:1.6,fontWeight:600}}>⚠️ Action irréversible !</p>
              <p style={{fontSize:'.85rem',color:'#666',lineHeight:1.6}}>Supprimer <strong>{modal.item.nom}</strong> définitivement ?</p>
            </div>
            <div className="admact"><button className="adbtn adbtn-ghost" onClick={()=>setModal(null)}>Annuler</button><button className="adbtn adbtn-danger" onClick={()=>exec('delete_produit',{produitId:modal.item.id})}>Supprimer</button></div>
          </div>
        </div>
      )}

      {/* SERVICE STATUS MODAL */}
      {modal?.type==='service_statut'&&(
        <div className="admb" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div className="admcont">
            <div className="admhead"><span className="admtitle">Changer le statut</span><button className="admclose" onClick={()=>setModal(null)}>✕</button></div>
            <div className="admbody">
              <p style={{fontSize:'.82rem',color:'#666',marginBottom:12}}>Service : <strong>{modal.item.nom}</strong> — actuel : {modal.item.statut}</p>
              {['actif','inactif','suspendu'].map(st => (
                <button key={st} className="adbtn adbtn-ghost" style={{justifyContent:'flex-start',padding:'10px 14px',fontSize:'.82rem',width:'100%',marginBottom:4}}
                  onClick={()=>exec('update_service_status',{serviceId:modal.item.id,statut:st})}>
                  <span className={`adpill ${st==='actif'?'actif':st==='suspendu'?'banned':'inactif'}`} style={{marginRight:8,minWidth:70,justifyContent:'center'}}>{st}</span>
                  {st==='actif'?'Actif':st==='inactif'?'Inactif':'Suspendu'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DELETE SERVICE MODAL */}
      {modal?.type==='delete_service'&&(
        <div className="admb" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div className="admcont">
            <div className="admhead"><span className="admtitle">Supprimer le service</span><button className="admclose" onClick={()=>setModal(null)}>✕</button></div>
            <div className="admbody">
              <p style={{fontSize:'.85rem',color:'#FF3B30',lineHeight:1.6,fontWeight:600}}>⚠️ Action irréversible !</p>
              <p style={{fontSize:'.85rem',color:'#666',lineHeight:1.6}}>Supprimer <strong>{modal.item.nom}</strong> définitivement ?</p>
            </div>
            <div className="admact"><button className="adbtn adbtn-ghost" onClick={()=>setModal(null)}>Annuler</button><button className="adbtn adbtn-danger" onClick={()=>exec('delete_service',{serviceId:modal.item.id})}>Supprimer</button></div>
          </div>
        </div>
      )}

      {toast&&<div className={`adtoast ${toast.type}`} onClick={()=>setToast(null)}>{toast.msg}</div>}
    </div>
  );
}
