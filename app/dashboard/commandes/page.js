'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Commandes() {
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
    try { const r = await api('GET', {}, { action: 'commandes', page: String(page), search }); setData(r); } catch (e) { console.error('Commandes fetch error:', e); }
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
        <h2>Commandes</h2>
        <p>Gestion des commandes de la marketplace</p>
      </div>

      <div className="adg" style={{gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))'}}>
        <div className="adc"><div className="adcl">Totales</div><div className="adcv">{data.total||0}</div></div>
        <div className="adc"><div className="adcl">En cours</div><div className="adcv">{data.enCours||0}</div></div>
        <div className="adc"><div className="adcl">Livrées</div><div className="adcv">{data.livrees||0}</div></div>
        <div className="adc"><div className="adcl">CA total</div><div className="adcv">{(data.ca||0).toLocaleString('fr-FR')} F</div></div>
      </div>

      <div className="adsec">
        <div style={{marginBottom:12,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <input className="adsrch" placeholder="Rechercher une commande…" value={search}
            onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter'&&fetchData()}/>
          <button className="adbtn adbtn-primary adbtn-sm" onClick={fetchData}>Rechercher</button>
        </div>
        {loading ? <div className="adld"><div className="adsp" /></div> : (
          <div className="adtw">
            <table className="adtabl">
              <thead><tr><th>N°</th><th>Client</th><th>Produits</th><th>Montant</th><th>Statut</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {(data.commandes||[]).map(c => (
                  <tr key={c.id}>
                    <td style={{fontSize:'.72rem',color:'#666',fontFamily:'monospace'}}>{c.numero||String(c.id).slice(0,12)}</td>
                    <td>
                      <div style={{display:'flex',flexDirection:'column',gap:1}}>
                        <span style={{fontWeight:600,fontSize:'.78rem'}}>{c.client_nom||c.user?.nom||c.user?.email?.split('@')[0]||'Inconnu'}</span>
                        <span style={{fontSize:'.68rem',color:'#999'}}>{c.client_email||c.user?.email||c.user_id?.slice(0,8)}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        {c.produits_data?.[0]?.image && (
                          <img src={c.produits_data[0].image} alt="" style={{width:32,height:32,borderRadius:6,objectFit:'cover',background:'#f5f5f5'}}/>
                        )}
                        <span style={{fontSize:'.78rem',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {(c.produits_data||[]).map(p=>p.nom).join(', ')||'—'}
                        </span>
                      </div>
                    </td>
                    <td style={{fontWeight:600}}>{(c.montant_total||0).toLocaleString('fr-FR')} F</td>
                    <td><span className={`adpill ${c.statut==='livree'||c.statut==='payee'?'actif':c.statut==='en_cours'||c.statut==='en_attente'?'en_attente':'inactif'}`}>{c.statut}</span></td>
                    <td style={{fontSize:'.72rem',color:'#8e8e93'}}>{new Date(c.created_at).toLocaleDateString('fr-FR')}</td>
                    <td><button className="adbtn adbtn-danger adbtn-sm" onClick={()=>setModal({type:'delete_commande',item:c})}>Suppr.</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data.commandes||data.commandes.length===0)&&<div className="adem"><div className="ademi">📋</div><h4 className="ademt">Aucune commande</h4><p className="ademd">Aucune commande trouvée</p></div>}
            <div className="adpag">
              <button className="adpbtn" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>←</button>
              <span style={{fontSize:'.78rem',color:'#8e8e93'}}>Page {page} / {data.totalPages||1}</span>
              <button className="adpbtn" disabled={page>=(data.totalPages||1)} onClick={()=>setPage(p=>p+1)}>→</button>
            </div>
          </div>
        )}
      </div>

      {modal?.type==='delete_commande'&&(
        <div className="admb" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
          <div className="admcont">
            <div className="admhead"><span className="admtitle">Supprimer la commande</span><button className="admclose" onClick={()=>setModal(null)}>✕</button></div>
            <div className="admbody">
              <p style={{fontSize:'.85rem',color:'#FF3B30',lineHeight:1.6,fontWeight:600}}>⚠️ Action irréversible !</p>
              <p style={{fontSize:'.85rem',color:'#666',lineHeight:1.6}}>Supprimer la commande <strong>{modal.item.numero||String(modal.item.id).slice(0,12)}</strong> ?</p>
            </div>
            <div className="admact"><button className="adbtn adbtn-ghost" onClick={()=>setModal(null)}>Annuler</button><button className="adbtn adbtn-danger" onClick={()=>exec('delete_commande',{commandeId:modal.item.id})}>Supprimer</button></div>
          </div>
        </div>
      )}

      {toast&&<div className={`adtoast ${toast.type}`} onClick={()=>setToast(null)}>{toast.msg}</div>}
    </div>
  );
}
