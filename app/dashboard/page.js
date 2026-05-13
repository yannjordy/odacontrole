'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function LineChart({ data, height = 80, color = '#1a1a2e', days = 7 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 100;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - (d.value / max) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} style={{display:'block'}}>
      <defs><linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity=".15"/>
        <stop offset="100%" stopColor={color} stopOpacity="0"/>
      </linearGradient></defs>
      <polygon points={`0,${height} ${pts} ${w},${height}`} fill={`url(#grad-${color.replace('#','')})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {[0, data.length-1].map(i => (
        <circle key={i} cx={parseFloat(pts.split(' ')[i].split(',')[0])} cy={parseFloat(pts.split(' ')[i].split(',')[1])} r="2" fill={color}/>
      ))}
    </svg>
  );
}

function Donut({ data, size = 120 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 45, cx = 60, cy = 60;
  let offset = 0;
  const colors = ['#1a1a2e','#007AFF','#FF9500','#34C759','#FF3B30','#5856D6'];
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      {data.map((d, i) => {
        const pct = d.value / total;
        const circ = 2 * Math.PI * r;
        const len = pct * circ;
        const dash = `${len} ${circ - len}`;
        const rotate = (offset / total) * 360;
        offset += d.value;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={colors[i%colors.length]} strokeWidth="14"
            strokeDasharray={dash} transform={`rotate(${rotate} ${cx} ${cy})`} strokeLinecap="round"/>
        );
      })}
      <text x={cx} y={cy-4} textAnchor="middle" fill="#1a1a1a" fontSize="14" fontWeight="800">{total}</text>
      <text x={cx} y={cy+10} textAnchor="middle" fill="#8e8e93" fontSize="7">total</text>
    </svg>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/connexion');
    });
  }, [router]);

  useEffect(() => { fetchAll(); }, []);

  async function api(params) {
    const qs = new URLSearchParams({ ...params, _t: Date.now() }).toString();
    const res = await fetch(`/api/admin?${qs}`, { headers: { 'Content-Type': 'application/json' } });
    return res.json();
  }

  async function fetchAll() {
    setLoading(true);
    try {
      const [stats, analytics] = await Promise.all([
        api({ action: 'stats' }),
        api({ action: 'analytics', jours: '30' }),
      ]);
      setData({ stats, analytics });
    } catch {}
    setLoading(false);
  }

  if (loading) return <div className="adld"><div className="adsp" /></div>;

  const s = data.stats || {};
  const a = data.analytics || {};

  return (
    <div>
      <div className="admh" style={{marginBottom:20}}>
        <h2>Tableau de bord</h2>
        <p>Aperçu général de la plateforme</p>
      </div>

      <div className="adg">
        <div className="adc"><div className="adci">👥</div><div className="adcl">Utilisateurs</div><div className="adcv">{s.users||0}</div>
          <div className="adcs up">+{s.newUsers30d||0} / 30j</div>
          <LineChart data={a.userGrowth||[]} height={50} color="#1a1a2e"/>
        </div>
        <div className="adc"><div className="adci">📦</div><div className="adcl">Produits</div><div className="adcv">{s.produits?.total||0}</div>
          <div className="adcs up">{s.produits?.publies||0} publiés</div>
          <div className="adcbar"><div style={{width:`${((s.produits?.publies||0)/Math.max(s.produits?.total||1,1))*100}%`,background:'#1a1a2e'}}/></div>
        </div>
        <div className="adc"><div className="adci">🛎️</div><div className="adcl">Services</div><div className="adcv">{s.services?.total||0}</div>
          <div className="adcs up">{s.services?.actifs||0} actifs</div>
          <div className="adcbar"><div style={{width:`${((s.services?.actifs||0)/Math.max(s.services?.total||1,1))*100}%`,background:'#007AFF'}}/></div>
        </div>
        <div className="adc"><div className="adci">📋</div><div className="adcl">Commandes</div><div className="adcv">{s.commandes?.total||0}</div>
          <div className="adcs up">{s.commandes?.mois||0} ce mois</div>
        </div>
        <div className="adc"><div className="adci">💰</div><div className="adcl">CA total</div><div className="adcv">{(s.commandes?.ca||0).toLocaleString('fr-FR')} F</div>
          <div className="adcs up">+{(s.commandes?.caMois||0).toLocaleString('fr-FR')} F / 30j</div>
        </div>
        <div className="adc"><div className="adci">💳</div><div className="adcl">Abonnements actifs</div><div className="adcv">{s.abonnementsActifs||0}</div>
          <div className="adcs">Revenu mensuel {(s.revenuAbonnementsMois||0).toLocaleString('fr-FR')} F</div>
        </div>
        <div className={`adc${(s.signalements||0)>0?' red':''}`}><div className="adci">🚩</div><div className="adcl">Signalements</div><div className="adcv">{s.signalements||0}</div>
          <div className="adcs down">en attente</div>
        </div>
        <div className="adc"><div className="adci">📢</div><div className="adcl">Boosts</div><div className="adcv">{s.boosts?.total||0}</div>
          <div className="adcs up">{s.boosts?.actifs||0} actifs</div>
        </div>
      </div>

      {(s.signalements||0)>0 && (
        <div style={{background:'#fff5f5',border:'1px solid #FF3B30',borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
          <span style={{fontSize:'1.5rem'}}>🚩</span>
          <div><div style={{fontWeight:700,fontSize:'.85rem',color:'#FF3B30'}}>{s.signalements} signalement(s) en attente</div></div>
          <a href="/dashboard/signalements" className="adbtn adbtn-danger adbtn-sm" style={{marginLeft:'auto'}}>Voir</a>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20,marginBottom:24}}>
        <div className="adc" style={{padding:20}}>
          <div className="adcl" style={{marginBottom:14}}>Évolution des utilisateurs (30 jours)</div>
          {a.userGrowth?.length > 0 ? (
            <div>
              <LineChart data={a.userGrowth} height={140} color="#1a1a2e" days={30}/>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'.6rem',color:'#8e8e93',marginTop:4}}>
                <span>{a.userGrowth[0]?.label||''}</span>
                <span>{a.userGrowth[a.userGrowth.length-1]?.label||''}</span>
              </div>
            </div>
          ) : <div className="ademd" style={{textAlign:'center',padding:30}}>Aucune donnée</div>}
        </div>

        <div className="adc" style={{padding:20}}>
          <div className="adcl" style={{marginBottom:14}}>Répartition des abonnements</div>
          {a.subscriptionBreakdown?.length > 0 ? (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
              <Donut data={a.subscriptionBreakdown} size={130}/>
              <div style={{width:'100%'}}>
                {a.subscriptionBreakdown.map((d, i) => (
                  <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:'.75rem',padding:'3px 0',borderBottom:'1px solid #f5f5f5'}}>
                    <span style={{color:'#666'}}>{d.label}</span>
                    <span style={{fontWeight:600}}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="ademd" style={{textAlign:'center',padding:30}}>Aucune donnée</div>}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div className="adc" style={{padding:20}}>
          <div className="adcl" style={{marginBottom:14}}>Revenus (30 jours)</div>
          {a.revenueTimeline?.length > 0 ? (
            <div>
              <LineChart data={a.revenueTimeline} height={100} color="#34C759" days={30}/>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'.6rem',color:'#8e8e93',marginTop:4}}>
                <span>{a.revenueTimeline[0]?.label||''}</span>
                <span>{a.revenueTimeline[a.revenueTimeline.length-1]?.label||''}</span>
              </div>
            </div>
          ) : <div className="ademd" style={{textAlign:'center',padding:30}}>Aucune donnée</div>}
        </div>
        <div className="adc" style={{padding:20}}>
          <div className="adcl" style={{marginBottom:14}}>Nouveaux utilisateurs vs Abonnés</div>
          {a.conversionTimeline?.length > 0 ? (
            <div>
              <LineChart data={a.conversionTimeline} height={100} color="#FF9500" days={30}/>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'.6rem',color:'#8e8e93',marginTop:4}}>
                <span>{a.conversionTimeline[0]?.label||''}</span>
                <span>{a.conversionTimeline[a.conversionTimeline.length-1]?.label||''}</span>
              </div>
            </div>
          ) : <div className="ademd" style={{textAlign:'center',padding:30}}>Aucune donnée</div>}
        </div>
      </div>
    </div>
  );
}
