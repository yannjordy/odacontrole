'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function LineChart({ data, height = 120, color = '#1a1a2e' }) {
  if (!data || data.length < 2) return <div className="ademd" style={{textAlign:'center',padding:'40px 0'}}>Aucune donnée</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 100;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - (d.value / max) * (height - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} style={{display:'block'}}>
      <defs><linearGradient id={`alg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity=".12"/>
        <stop offset="100%" stopColor={color} stopOpacity="0"/>
      </linearGradient></defs>
      <polygon points={`0,${height} ${pts} ${w},${height}`} fill={`url(#alg-${color.replace('#','')})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function BarChart({ data, height = 100, color = '#007AFF' }) {
  if (!data || data.length === 0) return <div className="ademd" style={{textAlign:'center',padding:'40px 0'}}>Aucune donnée</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:2,height}}>
      {data.map((d, i) => (
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
          <div style={{width:'80%',borderRadius:'3px 3px 0 0',height:`${Math.max((d.value/max)*height,2)}px`,
            background: `linear-gradient(180deg, ${color}, ${color}88)`,transition:'height .6s ease'}} title={`${d.label}: ${d.value}`}/>
          <span style={{fontSize:'.55rem',color:'#8e8e93',transform:'rotate(-45deg)',whiteSpace:'nowrap'}}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => { fetchData(); }, [period]);

  async function api(params) {
    const qs = new URLSearchParams({ ...params, _t: Date.now() }).toString();
    const res = await fetch(`/api/admin?${qs}`);
    return res.json();
  }

  async function fetchData() {
    setLoading(true);
    try {
      const a = await api({ action: 'analytics', jours: String(period) });
      setData(a);
    } catch {}
    setLoading(false);
  }

  if (loading) return <div className="adld"><div className="adsp" /></div>;

  return (
    <div>
      <div className="admh" style={{marginBottom:20}}>
        <h2>Analytiques</h2>
        <p>Statistiques détaillées de la plateforme</p>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:20}}>
        {[7,14,30,90].map(j => (
          <button key={j} className={`adbtn adbtn-sm ${period===j?'adbtn-primary':'adbtn-ghost'}`}
            onClick={()=>setPeriod(j)}>{j} jours</button>
        ))}
      </div>

      <div className="adg" style={{gridTemplateColumns:'1fr 1fr'}}>
        <div className="adc" style={{padding:20}}>
          <div className="adcl" style={{marginBottom:10}}>Croissance des utilisateurs</div>
          <div style={{fontSize:'1.6rem',fontWeight:800,marginBottom:6}}>
            {data.userGrowth?.reduce((s,d)=>s+d.value,0)||0}
            <span style={{fontSize:'.75rem',fontWeight:600,color:'#34C759',marginLeft:8}}>nouveaux</span>
          </div>
          <LineChart data={data.userGrowth} color="#1a1a2e"/>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'.6rem',color:'#8e8e93',marginTop:4}}>
            <span>{data.userGrowth?.[0]?.label||''}</span>
            <span>{data.userGrowth?.[data.userGrowth.length-1]?.label||''}</span>
          </div>
        </div>
        <div className="adc" style={{padding:20}}>
          <div className="adcl" style={{marginBottom:10}}>Revenus</div>
          <div style={{fontSize:'1.6rem',fontWeight:800,marginBottom:6}}>
            {(data.revenueTimeline?.reduce((s,d)=>s+d.value,0)||0).toLocaleString('fr-FR')}
            <span style={{fontSize:'.75rem',fontWeight:600,color:'#8e8e93',marginLeft:8}}>F CFA</span>
          </div>
          <LineChart data={data.revenueTimeline} color="#34C759"/>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'.6rem',color:'#8e8e93',marginTop:4}}>
            <span>{data.revenueTimeline?.[0]?.label||''}</span>
            <span>{data.revenueTimeline?.[data.revenueTimeline.length-1]?.label||''}</span>
          </div>
        </div>
      </div>

      <div className="adg" style={{gridTemplateColumns:'1fr 1fr',marginTop:20}}>
        <div className="adc" style={{padding:20}}>
          <div className="adcl" style={{marginBottom:10}}>Souscriptions abonnement</div>
          <BarChart data={data.conversionTimeline} color="#FF9500"/>
        </div>
        <div className="adc" style={{padding:20}}>
          <div className="adcl" style={{marginBottom:10}}>Répartition des abonnements</div>
          {data.subscriptionBreakdown?.length > 0 ? (
            <div style={{display:'flex',flexDirection:'column',gap:8,paddingTop:8}}>
              {data.subscriptionBreakdown.map((d, i) => {
                const total = data.subscriptionBreakdown.reduce((s,x)=>s+x.value,0);
                const pct = ((d.value/total)*100).toFixed(0);
                const colors = ['#1a1a2e','#007AFF','#FF9500','#34C759'];
                return (
                  <div key={i}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'.78rem',marginBottom:4}}>
                      <span style={{fontWeight:600}}>{d.label}</span>
                      <span style={{color:'#666'}}>{d.value} ({pct}%)</span>
                    </div>
                    <div className="adcbar"><div style={{width:`${pct}%`,background:colors[i%colors.length],height:6,borderRadius:3}}/></div>
                  </div>
                );
              })}
            </div>
          ) : <div className="ademd" style={{textAlign:'center',padding:30}}>Aucune donnée</div>}
        </div>
      </div>
    </div>
  );
}
