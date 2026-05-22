'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRole } from '../RoleContext';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Services() {
  const { isAdmin } = useRole();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
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
    try { const r = await api('GET', {}, { action: 'services', page: String(page), search }); setData(r); } catch {}
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
      <div className="adpagehead" style={{marginBottom:20}}>
        <h2>Services</h2>
        <p>Tous les services proposés sur la marketplace</p>
      </div>

      <div style={{marginBottom:12,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        <input className="adsrch" placeholder="Rechercher un service…" value={search}
          onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter'&&fetchData()}/>
        <button className="adbtn adbtn-primary adbtn-sm" onClick={fetchData}>Rechercher</button>
      </div>
      {loading ? <div className="adld"><div className="adsp" /></div> : (
        <div className="adtw">
          <table className="adtabl">
            <thead><tr><th>Service</th><th>Vendeur</th><th>Prix</th><th>Statut</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {(data.services||[]).map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        {s.images?.[0]&&<img src={s.images[0]} alt="" style={{width:36,height:36,borderRadius:8,objectFit:'cover',background:'#f5f5f5'}}/>}
                        <span style={{fontWeight:600,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.nom}</span>
                      </div>
                    </td>
                    <td style={{fontSize:'.78rem',color:'#666'}}>{s.user?.email||s.user_id?.slice(0,8)}</td>
                    <td>{(s.prix||0).toLocaleString('fr-FR')} F</td>
                    <td><span className={`adpill ${s.statut==='actif'?'actif':s.statut==='inactif'?'inactif':'banned'}`}>{s.statut}</span></td>
                    <td style={{fontSize:'.72rem',color:'#8e8e93'}}>{new Date(s.created_at).toLocaleDateString('fr-FR')}</td>
                    <td>
                      {isAdmin && <div style={{display:'flex',gap:4}}>
                        <button className="adbtn adbtn-warning adbtn-sm" onClick={()=>setModal({type:'service_statut',item:s})}>Statut</button>
                        <button className="adbtn adbtn-danger adbtn-sm" onClick={()=>setModal({type:'delete_service',item:s})}>Suppr.</button>
                      </div>}
                    </td>
                  </tr>
                ))}
              </tbody>
          </table>
          {(!data.services||data.services.length===0)&&<div className="adem"><div className="ademi">🛎️</div><h4 className="ademt">Aucun service</h4><p className="ademd">Aucun service trouvé</p></div>}
          <div className="adpag">
            <button className="adpbtn" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>←</button>
            <span style={{fontSize:'.78rem',color:'#8e8e93'}}>Page {page} / {data.totalPages||1}</span>
            <button className="adpbtn" disabled={page>=(data.totalPages||1)} onClick={()=>setPage(p=>p+1)}>→</button>
          </div>
        </div>
      )}

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
