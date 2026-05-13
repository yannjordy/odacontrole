'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function Donut({ data, size = 140 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 52, cx = 70, cy = 70;
  let offset = 0;
  const colors = ['#1a1a2e','#007AFF','#FF9500','#34C759'];
  return (
    <svg width={size} height={size} viewBox="0 0 140 140">
      {data.map((d, i) => {
        const pct = d.value / total;
        const circ = 2 * Math.PI * r;
        const len = pct * circ;
        const rotate = (offset / total) * 360;
        offset += d.value;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={colors[i%colors.length]} strokeWidth="16"
            strokeDasharray={`${len} ${circ - len}`} transform={`rotate(${rotate} ${cx} ${cy})`} strokeLinecap="round"/>
        );
      })}
      <text x={cx} y={cy-4} textAnchor="middle" fill="#1a1a1a" fontSize="16" fontWeight="800">{total}</text>
      <text x={cx} y={cy+10} textAnchor="middle" fill="#8e8e93" fontSize="8">actifs</text>
    </svg>
  );
}

export default function Abonnements() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function api(params) {
    const qs = new URLSearchParams({ ...params, _t: Date.now() }).toString();
    const s = await supabase.auth.getSession();
    const res = await fetch(`/api/admin?${qs}`, { headers: { 'x-admin-id': s?.data?.session?.user?.id } });
    return res.json();
  }

  async function fetchData() {
    setLoading(true);
    try { const r = await api({ action: 'abonnements' }); setData(r); } catch {}
    setLoading(false);
  }

  if (loading) return <div className="adld"><div className="adsp" /></div>;

  const stats = data.stats || {};

  return (
    <div>
      <div className="admh" style={{marginBottom:20}}>
        <h2>Abonnements</h2>
        <p>Gestion des abonnements et revenus récurrents</p>
      </div>

      <div className="adg" style={{gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))'}}>
        <div className="adc"><div className="adci">💳</div><div className="adcl">Abonnements actifs</div><div className="adcv">{stats.actifs||0}</div></div>
        <div className="adc"><div className="adci">📊</div><div className="adcl">Taux de conversion</div><div className="adcv">{stats.tauxConversion||'0'}%</div></div>
        <div className="adc"><div className="adci">📈</div><div className="adcl">Revenu mensuel estimé</div><div className="adcv">{(stats.revenuMensuel||0).toLocaleString('fr-FR')} F</div></div>
        <div className="adc"><div className="adci">📉</div><div className="adcl">Résiliation (30j)</div><div className="adcv">{stats.resiliations||0}</div></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div className="adc" style={{padding:20,display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div className="adcl" style={{marginBottom:14,alignSelf:'flex-start'}}>Répartition par plan</div>
          {data.breakdown?.length > 0 ? (
            <>
              <Donut data={data.breakdown} size={160}/>
              <div style={{width:'100%',marginTop:16}}>
                {data.breakdown.map((d, i) => {
                  const total = data.breakdown.reduce((s,x)=>s+x.value,0);
                  const colors = ['#1a1a2e','#007AFF','#FF9500','#34C759'];
                  return (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',borderBottom:'1px solid #f5f5f5'}}>
                      <div style={{width:10,height:10,borderRadius:'50%',background:colors[i%colors.length]}}/>
                      <span style={{flex:1,fontSize:'.82rem'}}>{d.label}</span>
                      <span style={{fontWeight:600,fontSize:'.82rem'}}>{d.value}</span>
                      <span style={{fontSize:'.72rem',color:'#999',width:40,textAlign:'right'}}>{((d.value/total)*100).toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : <div className="ademd" style={{padding:40}}>Aucune donnée</div>}
        </div>

        <div className="adc" style={{padding:20}}>
          <div className="adcl" style={{marginBottom:14}}>Derniers abonnements</div>
          {(data.recent||[]).length > 0 ? (
            <div>
              {(data.recent||[]).map((a, i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #f5f5f5'}}>
                  <div>
                    <div style={{fontSize:'.82rem',fontWeight:600}}>{a.user?.email||a.user_id?.slice(0,8)}</div>
                    <div style={{fontSize:'.72rem',color:'#8e8e93'}}>{a.plan} · {new Date(a.created_at).toLocaleDateString('fr-FR')}</div>
                  </div>
                  <span className={`adpill ${a.statut==='actif'?'actif':'inactif'}`}>{a.statut}</span>
                </div>
              ))}
            </div>
          ) : <div className="ademd" style={{textAlign:'center',padding:30}}>Aucun abonnement</div>}
        </div>
      </div>
    </div>
  );
}
