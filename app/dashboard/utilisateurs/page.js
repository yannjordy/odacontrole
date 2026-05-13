'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ROLES_MAP = { super_admin:'Super Admin', admin:'Admin', moderator:'Modérateur', support:'Support' };

export default function Utilisateurs() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState(null);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.user_metadata?.admin_role) setRole(session.user.user_metadata.admin_role);
    });
  }, []);

  useEffect(() => { fetchData(); }, [page]);

  async function api(method, body = {}, params = {}) {
    const qs = new URLSearchParams({ ...params, _t: Date.now() }).toString();
    const s = await supabase.auth.getSession();
    const res = await fetch(`/api/admin?${qs}`, {
      method, headers: { 'Content-Type': 'application/json', 'x-admin-id': s?.data?.session?.user?.id },
      body: method === 'POST' ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }

  async function fetchData() {
    setLoading(true);
    try { const r = await api('GET', {}, { action: 'users', page: String(page) }); setData(r); } catch {}
    setLoading(false);
  }

  async function exec(action, payload) {
    try {
      const res = await api('POST', { action, ...payload });
      if (res.success) { showToast('Action effectuée'); setModal(null); fetchData(); }
      else showToast(res.error||'Erreur', 'error');
    } catch { showToast('Erreur réseau', 'error'); }
  }

  return (
    <div>
      <div className="admh" style={{marginBottom:20}}>
        <h2>Utilisateurs</h2>
        <p>Gestion des comptes utilisateurs</p>
      </div>

      <div style={{marginBottom:12,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        <input className="adsrch" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)}/>
      </div>
      {loading ? <div className="adld"><div className="adsp" /></div> : (
        <div className="adtw">
          <table className="adtabl">
            <thead><tr><th>Utilisateur</th><th>Email</th><th>Rôle</th><th>Abonnement</th><th>Produits</th><th>Inscrit</th><th>Actions</th></tr></thead>
            <tbody>
              {(data.users||[]).filter(u => !search||u.email?.toLowerCase().includes(search.toLowerCase())||u.nom?.toLowerCase().includes(search.toLowerCase())).map(u => (
                <tr key={u.id}>
                  <td><div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#007AFF,#5856D6)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'.7rem',fontWeight:700,flexShrink:0}}>
                      {u.photo?<img src={u.photo} alt="" style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}}/>:u.nom?.charAt(0)?.toUpperCase()||'?'}
                    </div>
                    <span style={{fontWeight:600}}>{u.nom}</span>{u.banned&&<span className="adpill banned">Bloqué</span>}
                  </div></td>
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
            <span style={{fontSize:'.78rem',color:'#8e8e93'}}>Page {page} / {data.totalPages||1}</span>
            <button className="adpbtn" disabled={page>=(data.totalPages||1)} onClick={()=>setPage(p=>p+1)}>→</button>
          </div>
        </div>
      )}

      {modal?.type==='block'&&(
        <div className="admb" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div className="admcont">
            <div className="admhead"><span className="admtitle">Bloquer l'utilisateur</span><button className="admclose" onClick={()=>setModal(null)}>✕</button></div>
            <div className="admbody"><p style={{fontSize:'.85rem',color:'#666',lineHeight:1.6}}>Bloquer <strong>{modal.user.nom}</strong> ({modal.user.email}) ? Il ne pourra plus se connecter pendant 2 ans.</p></div>
            <div className="admact"><button className="adbtn adbtn-ghost" onClick={()=>setModal(null)}>Annuler</button><button className="adbtn adbtn-danger" onClick={()=>exec('block_user',{userId:modal.user.id})}>Bloquer</button></div>
          </div>
        </div>
      )}

      {modal?.type==='delete'&&(
        <div className="admb" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div className="admcont">
            <div className="admhead"><span className="admtitle">Supprimer l'utilisateur</span><button className="admclose" onClick={()=>setModal(null)}>✕</button></div>
            <div className="admbody"><p style={{fontSize:'.85rem',color:'#FF3B30',lineHeight:1.6,fontWeight:600}}>⚠️ Action irréversible !</p><p style={{fontSize:'.85rem',color:'#666',lineHeight:1.6}}>Toutes les données de <strong>{modal.user.nom}</strong> seront supprimées.</p></div>
            <div className="admact"><button className="adbtn adbtn-ghost" onClick={()=>setModal(null)}>Annuler</button><button className="adbtn adbtn-danger" onClick={()=>exec('delete_user',{userId:modal.user.id})}>Supprimer</button></div>
          </div>
        </div>
      )}

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

      {toast&&<div className={`adtoast ${toast.type}`} onClick={()=>setToast(null)}>{toast.msg}</div>}
    </div>
  );
}
