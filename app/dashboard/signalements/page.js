'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Signalements() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => { fetchData(); }, []);

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
    try { const r = await api('GET', {}, { action: 'signalements' }); setData(r); } catch {}
    setLoading(false);
  }

  async function exec(action, payload) {
    try {
      const res = await api('POST', { action, ...payload });
      if (res.success) { showToast('Action effectuée'); fetchData(); }
      else showToast(res.error||'Erreur', 'error');
    } catch { showToast('Erreur réseau', 'error'); }
  }

  return (
    <div>
      <div className="admh" style={{marginBottom:20}}>
        <h2>Signalements</h2>
        <p>Contenus signalés par les utilisateurs</p>
      </div>

      {loading?<div className="adld"><div className="adsp"/></div>:(
        <div className="adtw">
          <table className="adtabl">
            <thead><tr><th>Type</th><th>Cible</th><th>Raison</th><th>Statut</th><th>Date</th><th>Action</th></tr></thead>
            <tbody>
              {(data.signalements||[]).map(s=>(
                <tr key={s.id}>
                  <td><span className="adpill">{s.type}</span></td>
                  <td style={{fontSize:'.78rem',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.target_id}</td>
                  <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.raison}</td>
                  <td><span className={`adpill ${s.statut}`}>{s.statut}</span></td>
                  <td style={{fontSize:'.72rem',color:'#8e8e93'}}>{new Date(s.created_at).toLocaleDateString('fr-FR')}</td>
                  <td>{s.statut==='en_attente'?<div style={{display:'flex',gap:4}}>
                    <button className="adbtn adbtn-success adbtn-sm" onClick={()=>exec('traiter_signalement',{signalementId:s.id,statut:'resolu',actionPrise:'Aucune action'})}>✅ Approuver</button>
                    <button className="adbtn adbtn-danger adbtn-sm" onClick={()=>exec('traiter_signalement',{signalementId:s.id,statut:'rejete',actionPrise:'Rejeté'})}>❌ Rejeter</button>
                  </div>:<span style={{fontSize:'.72rem',color:'#8e8e93'}}>Traité</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!data.signalements||data.signalements.length===0)&&<div className="adem"><div className="ademi">✅</div><h4 className="ademt">Aucun signalement</h4><p className="ademd">Tout est calme</p></div>}
        </div>
      )}

      {toast&&<div className={`adtoast ${toast.type}`} onClick={()=>setToast(null)}>{toast.msg}</div>}
    </div>
  );
}
