'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Trafic() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [jours, setJours] = useState(7);

  useEffect(() => { fetchData(); }, [jours]);

  async function api(params) {
    const qs = new URLSearchParams({ ...params, _t: Date.now() }).toString();
    const s = await supabase.auth.getSession();
    const res = await fetch(`/api/admin?${qs}`, { headers: { 'x-admin-id': s?.data?.session?.user?.id } });
    return res.json();
  }

  async function fetchData() {
    setLoading(true);
    try { const r = await api({ action: 'visiteurs', jours: String(jours) }); setData(r); } catch {}
    setLoading(false);
  }

  if (loading) return <div className="adld"><div className="adsp" /></div>;

  return (
    <div>
      <div className="admh" style={{marginBottom:20}}>
        <h2>Trafic</h2>
        <p>Analyse des visites et pages populaires</p>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {[7,30,90].map(j => (
          <button key={j} className={`adbtn adbtn-sm ${jours===j?'adbtn-primary':'adbtn-ghost'}`}
            onClick={()=>setJours(j)}>{j} jours</button>
        ))}
      </div>

      <div className="adg" style={{gridTemplateColumns:'1fr 1fr'}}>
        <div className="adc"><div className="adci">👁️</div><div className="adcl">Visites totales</div><div className="adcv">{data.total||0}</div></div>
        <div className="adc"><div className="adci">📅</div><div className="adcl">Période</div><div className="adcv" style={{fontSize:'1rem'}}>{jours} jours</div></div>
      </div>

      <div className="adc" style={{padding:20,marginBottom:16}}>
        <div className="adcl" style={{marginBottom:12}}>Visites par jour</div>
        {data.visitsParJour?.length>0?(
          <div>
            <div className="adchart">
              {(()=>{const max=Math.max(...data.visitsParJour.map(v=>v.count),1);return data.visitsParJour.map((v,i)=>(
                <div key={i} className="adcol" style={{height:`${Math.max((v.count/max)*100,2)}%`,background:'linear-gradient(180deg,#1a1a2e,#5856D6)'}} title={`${v.date}:${v.count}`}>
                  <div className="adlbl">{v.date?.slice(5)}</div>
                </div>
              ))})()}
            </div>
          </div>
        ):<div className="ademd" style={{textAlign:'center',padding:30}}>Aucune donnée</div>}
      </div>

      <div className="adc" style={{padding:20}}>
        <div className="adcl" style={{marginBottom:12}}>Pages les plus visitées</div>
        {data.topPages?.length>0?(
          <div className="adtw" style={{boxShadow:'none',border:'none'}}>
            <table className="adtabl"><thead><tr><th>Page</th><th>Visites</th></tr></thead>
              <tbody>{data.topPages.map((p,i)=>(
                <tr key={i}><td style={{fontWeight:500,fontFamily:'monospace',fontSize:'.78rem'}}>{p.page}</td><td><strong>{p.count}</strong></td></tr>
              ))}</tbody>
            </table>
          </div>
        ):<div className="ademd" style={{textAlign:'center',padding:30}}>Aucune donnée</div>}
      </div>
    </div>
  );
}
