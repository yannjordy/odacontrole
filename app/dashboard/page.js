'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { SvgIcon } from '../../lib/icons';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function smoothPath(data, w, h, max) {
  if (!data || data.length < 2) return '';
  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - (d.value / Math.max(max, 1)) * (h - 6) - 3,
  }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function MiniChart({ data, height = 50, color = '#1a1a2e' }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 100;
  const line = smoothPath(data, w, height, max);
  const area = line + ` L ${w} ${height} L 0 ${height} Z`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} style={{display:'block',marginTop:6}}>
      <defs><linearGradient id={`mg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity=".15"/><stop offset="100%" stopColor={color} stopOpacity="0"/>
      </linearGradient></defs>
      <path d={area} fill={`url(#mg-${color.replace('#','')})`}/>
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{animation:'fIn .5s ease'}}/>
    </svg>
  );
}

function AreaChart({ data, height = 140, color = '#1a1a2e' }) {
  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);
  if (!data || data.length < 2) return <div className="ademd" style={{textAlign:'center',padding:30}}>Aucune donnée</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 100;
  const line = smoothPath(data, w, height, max);
  const area = line + ` L ${w} ${height} L 0 ${height} Z`;
  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * w;
    const idx = Math.round((mx / w) * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    setHovered(clamped);
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }
  return (
    <div style={{position:'relative',animation:'fIn .5s ease'}}>
      <svg ref={svgRef} width="100%" height={height} viewBox={`0 0 ${w} ${height}`} style={{display:'block'}}
        onMouseMove={handleMove} onMouseLeave={()=>setHovered(null)}>
        <defs><linearGradient id={`ag-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".2"/><stop offset="100%" stopColor={color} stopOpacity=".02"/>
        </linearGradient>
        <filter id={`gl-${color.replace('#','')}`}><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <path d={area} fill={`url(#ag-${color.replace('#','')})`}/>
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter={`url(#gl-${color.replace('#','')})`} style={{animation:'fIn .6s ease'}}/>
        {data.map((d,i)=>{
          const x = (i/(data.length-1))*w;
          const y = height-(d.value/max)*(height-6)-3;
          return <g key={i}>
            <rect x={x-(w/data.length/2)} y={0} width={w/data.length} height={height} fill="transparent"
              onMouseEnter={()=>{setHovered(i);const r=svgRef.current?.getBoundingClientRect();if(r)setTooltipPos({x:((i/(data.length-1))*r.width),y:20})}}/>
            {(i===0||i===data.length-1) && <circle cx={x} cy={y} r="3" fill="white" stroke={color} strokeWidth="2"/>}
          </g>;
        })}
        {hovered!==null && data[hovered] && (
          <g>
            <line x1={(hovered/(data.length-1))*w} y1={0} x2={(hovered/(data.length-1))*w} y2={height} stroke={color} strokeWidth="1" strokeDasharray="3,3" opacity=".4"/>
            <rect x={(hovered/(data.length-1))*w-30} y={height+2} width={60} height={18} rx={4} fill="#1a1a1a"/>
            <text x={(hovered/(data.length-1))*w} y={height+14} textAnchor="middle" fill="#fff" fontSize="7" fontWeight="600">{data[hovered].label}</text>
          </g>
        )}
      </svg>
      {hovered!==null && data[hovered] && (
        <div style={{position:'absolute',left:tooltipPos.x,top:Math.max(tooltipPos.y-40,0),background:'#1a1a1a',color:'#fff',padding:'4px 10px',borderRadius:8,fontSize:'.75rem',fontWeight:600,whiteSpace:'nowrap',pointerEvents:'none',transform:'translateX(-50%)',zIndex:100,boxShadow:'0 2px 8px rgba(0,0,0,.2)'}}>
          {data[hovered].label}: <strong>{data[hovered].value}</strong>
        </div>
      )}
    </div>
  );
}

function Donut({ data, size = 120 }) {
  const [hovered, setHovered] = useState(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 45, cx = 60, cy = 60;
  let offset = 0;
  const colors = ['#1a1a2e','#007AFF','#FF9500','#34C759','#FF3B30','#5856D6'];
  return (
    <div style={{position:'relative',display:'inline-block'}}>
      <svg width={size} height={size} viewBox="0 0 120 120">
        {data.map((d, i) => {
          const pct = d.value / total;
          const circ = 2 * Math.PI * r;
          const len = pct * circ;
          const rotate = (offset / total) * 360;
          offset += d.value;
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke={colors[i%colors.length]} strokeWidth="14"
                strokeDasharray={`${len} ${circ-len}`} transform={`rotate(${rotate} ${cx} ${cy})`} strokeLinecap="round"
                onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}
                style={{cursor:'pointer',transition:'opacity .2s',opacity:hovered===null||hovered===i?1:.4}}/>
              <circle cx={cx} cy={cy} r={r+7} fill="none" stroke="transparent" strokeWidth="20"
                strokeDasharray={`${len} ${circ-len}`} transform={`rotate(${rotate} ${cx} ${cy})`}
                onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}
                style={{cursor:'pointer'}}/>
            </g>
          );
        })}
        <text x={cx} y={cy-4} textAnchor="middle" fill="#1a1a1a" fontSize="14" fontWeight="800">{total}</text>
        <text x={cx} y={cy+10} textAnchor="middle" fill="#8e8e93" fontSize="7">total</text>
      </svg>
      {hovered!==null && data[hovered] && (
        <div style={{position:'absolute',left:'50%',top:'-8px',transform:'translateX(-50%) translateY(-100%)',background:'#1a1a1a',color:'#fff',padding:'4px 10px',borderRadius:8,fontSize:'.75rem',fontWeight:600,whiteSpace:'nowrap',pointerEvents:'none',zIndex:100,boxShadow:'0 2px 8px rgba(0,0,0,.2)'}}>
          {data[hovered].label}: <strong>{data[hovered].value}</strong>
        </div>
      )}
    </div>
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
    const s = await supabase.auth.getSession();
    const res = await fetch(`/api/admin?${qs}`, { headers: { 'Content-Type': 'application/json', 'x-admin-id': s?.data?.session?.user?.id || '' } });
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
      <div className="adpagehead" style={{marginBottom:20}}>
        <h2>Tableau de bord</h2>
        <p>Aperçu général de la plateforme</p>
      </div>

        <div className="adg">
          <div className="adc"><div className="adci"><SvgIcon name="users" size={28} color="currentColor"/></div><div className="adcl">Utilisateurs</div><div className="adcv">{s.users||0}</div>
            <div className="adcs up">+{s.newUsers30d||0} / 30j</div>
            <MiniChart data={a.userGrowth||[]} color="#1a1a2e"/>
          </div>
          <div className="adc"><div className="adci"><SvgIcon name="products" size={28} color="currentColor"/></div><div className="adcl">Produits</div><div className="adcv">{s.produits?.total||0}</div>
            <div className="adcs up">{s.produits?.publies||0} publiés</div>
            <div className="adcbar"><div style={{width:`${((s.produits?.publies||0)/Math.max(s.produits?.total||1,1))*100}%`,background:'#1a1a2e'}}/></div>
          </div>
          <div className="adc"><div className="adci"><SvgIcon name="services" size={28} color="currentColor"/></div><div className="adcl">Services</div><div className="adcv">{s.services?.total||0}</div>
            <div className="adcs up">{s.services?.actifs||0} actifs</div>
            <div className="adcbar"><div style={{width:`${((s.services?.actifs||0)/Math.max(s.services?.total||1,1))*100}%`,background:'#007AFF'}}/></div>
          </div>
          <div className="adc"><div className="adci"><SvgIcon name="orders" size={28} color="currentColor"/></div><div className="adcl">Commandes</div><div className="adcv">{s.commandes?.total||0}</div>
            <div className="adcs up">{s.commandes?.mois||0} ce mois</div>
          </div>
          <div className="adc"><div className="adci"><SvgIcon name="wallet" size={28} color="currentColor"/></div><div className="adcl">CA total</div><div className="adcv">{(s.commandes?.ca||0).toLocaleString('fr-FR')} F</div>
            <div className="adcs up">+{(s.commandes?.caMois||0).toLocaleString('fr-FR')} F / 30j</div>
          </div>
          <div className="adc"><div className="adci"><SvgIcon name="subscriptions" size={28} color="currentColor"/></div><div className="adcl">Abonnements actifs</div><div className="adcv">{s.abonnementsActifs||0}</div>
            <div className="adcs">Revenu mensuel {(s.revenuAbonnementsMois||0).toLocaleString('fr-FR')} F</div>
          </div>
          <div className={`adc${(s.signalements||0)>0?' red':''}`}><div className="adci"><SvgIcon name="reports" size={28} color="currentColor"/></div><div className="adcl">Signalements</div><div className="adcv">{s.signalements||0}</div>
            <div className="adcs down">en attente</div>
          </div>
          <div className="adc"><div className="adci"><SvgIcon name="bolt" size={28} color="currentColor"/></div><div className="adcl">Boosts</div><div className="adcv">{s.boosts?.total||0}</div>
            <div className="adcs up">{s.boosts?.actifs||0} actifs</div>
          </div>
        </div>

      {(s.signalements||0)>0 && (
        <div style={{background:'#fff5f5',border:'1px solid #FF3B30',borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
          <SvgIcon name="reports" size={24} color="#FF3B30"/>
          <div><div style={{fontWeight:700,fontSize:'.85rem',color:'#FF3B30'}}>{s.signalements} signalement(s) en attente</div></div>
          <a href="/dashboard/signalements" className="adbtn adbtn-danger adbtn-sm" style={{marginLeft:'auto'}}>Voir</a>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20,marginBottom:24}}>
        <div className="adc" style={{padding:20}}>
          <div className="adcl" style={{marginBottom:14}}>Évolution des utilisateurs (30 jours)</div>
          {a.userGrowth?.length > 0 ? (
            <div>
              <AreaChart data={a.userGrowth} color="#1a1a2e"/>
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
              <AreaChart data={a.revenueTimeline} height={100} color="#34C759"/>
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
              <AreaChart data={a.conversionTimeline} height={100} color="#FF9500"/>
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
