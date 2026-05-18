'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function smoothPath(data, w, h, max) {
  if (!data || data.length < 2) return '';
  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - (d.value / Math.max(max, 1)) * (h - 8) - 4,
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

function AreaChart({ data, height = 130, color = '#1a1a2e', label = '' }) {
  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);
  if (!data || data.length < 2) return <div className="ademd" style={{textAlign:'center',padding:'40px 0'}}>Aucune donnée</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 100;
  const line = smoothPath(data, w, height, max);
  const area = line + ` L ${w} ${height} L 0 ${height} Z`;
  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * w;
    const idx = Math.round((mx / w) * (data.length - 1));
    setHovered(Math.max(0, Math.min(data.length - 1, idx)));
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }
  return (
    <div style={{position:'relative',animation:'fIn .5s ease'}}>
      <svg ref={svgRef} width="100%" height={height} viewBox={`0 0 ${w} ${height}`} style={{display:'block'}}
        onMouseMove={handleMove} onMouseLeave={()=>setHovered(null)}>
        <defs>
          <linearGradient id={`ag-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".2"/>
            <stop offset="100%" stopColor={color} stopOpacity=".02"/>
          </linearGradient>
          <filter id={`glow-${color.replace('#','')}`}>
            <feGaussianBlur stdDeviation="1.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <path d={area} fill={`url(#ag-${color.replace('#','')})`}/>
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          filter={`url(#glow-${color.replace('#','')})`} style={{animation:'fIn .6s ease'}}/>
        {data.map((d,i)=>{
          const x = (i/(data.length-1))*w;
          const y = height-(d.value/max)*(height-8)-4;
          return <g key={i}>
            <rect x={x-(w/data.length/2)} y={0} width={w/data.length} height={height} fill="transparent"
              onMouseEnter={()=>{setHovered(i);const r=svgRef.current?.getBoundingClientRect();if(r)setTooltipPos({x:((i/(data.length-1))*r.width),y:20})}}/>
            {(i===0||i===data.length-1||data.length<8) && <circle cx={x} cy={y} r="3" fill="white" stroke={color} strokeWidth="2" style={{animation:'fIn .8s ease'}}/>}
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

function GradientBar({ data, height = 110, colors = ['#FF6B35','#FF8E53','#FFA726','#FFCC02'] }) {
  if (!data || data.length === 0) return <div className="ademd" style={{textAlign:'center',padding:'40px 0'}}>Aucune donnée</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:3,height,padding:'4px 0'}}>
      {data.map((d, i) => (
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,animation:`fIn ${.3+i*.03}s ease`}}>
          <div title={`${d.label}: ${d.value}`}
            style={{width:'75%',borderRadius:'4px 4px 0 0',height:`${Math.max((d.value/max)*height,3)}px`,
              background:`linear-gradient(180deg,${colors[i%colors.length]},${colors[(i+1)%colors.length]})`,
              transition:'height .5s ease',boxShadow:`0 0 8px ${colors[i%colors.length]}44`}}/>
          <span style={{fontSize:'.5rem',color:'#8e8e93',transform:'rotate(-45deg)',whiteSpace:'nowrap',marginTop:2}}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState({});
  const [agentData, setAgentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => { fetchData(); }, [period]);

  async function api(params) {
    const qs = new URLSearchParams({ ...params, _t: Date.now() }).toString();
    const s = await supabase.auth.getSession();
    const res = await fetch(`/api/admin?${qs}`, { headers: { 'x-admin-id': s?.data?.session?.user?.id || '' } });
    return res.json();
  }

  async function fetchData() {
    setLoading(true);
    try {
      const [a, ag] = await Promise.all([
        api({ action: 'analytics', jours: String(period) }),
        api({ action: 'agent_metrics', jours: String(period) }),
      ]);
      setData(a);
      setAgentData(ag);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading) return <div className="adld"><div className="adsp" /></div>;

  const totalUsers = data.userGrowth?.reduce((s,d) => s+d.value, 0) || 0;
  const totalRevenue = data.revenueTimeline?.reduce((s,d) => s+d.value, 0) || 0;
  const totalSubs = data.conversionTimeline?.reduce((s,d) => s+d.value, 0) || 0;

  return (
    <div>
      <div className="adpagehead" style={{marginBottom:20}}>
        <h2>Analytiques</h2>
        <p>Statistiques détaillées de la plateforme</p>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {[7,14,30,90].map(j => (
          <button key={j} className={`adbtn adbtn-sm ${period===j?'adbtn-primary':'adbtn-ghost'}`}
            style={period===j?{background:'linear-gradient(135deg,#1a1a2e,#5856D6)',color:'white',border:'none'}:{}}
            onClick={()=>setPeriod(j)}>{j} jours</button>
        ))}
      </div>

      <div className="adg" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        <div className="adc"><div className="adci">👥</div><div className="adcl">Nouveaux utilisateurs</div><div className="adcv" style={{color:'#1a1a2e'}}>{totalUsers}</div></div>
        <div className="adc"><div className="adci">💰</div><div className="adcl">Revenus</div><div className="adcv" style={{color:'#34C759'}}>{totalRevenue.toLocaleString('fr-FR')} F</div></div>
        <div className="adc"><div className="adci">📈</div><div className="adcl">Souscriptions</div><div className="adcv" style={{color:'#FF9500'}}>{totalSubs}</div></div>
      </div>

      <div className="adg" style={{gridTemplateColumns:'1fr 1fr'}}>
        <div className="adc" style={{padding:20}}>
          <div className="adcl" style={{marginBottom:8,display:'flex',justifyContent:'space-between'}}>
            <span>Croissance des utilisateurs</span>
            <span style={{color:'#1a1a2e',fontWeight:700}}>+{totalUsers}</span>
          </div>
          <AreaChart data={data.userGrowth} color="#1a1a2e"/>
        </div>
        <div className="adc" style={{padding:20}}>
          <div className="adcl" style={{marginBottom:8,display:'flex',justifyContent:'space-between'}}>
            <span>Revenus</span>
            <span style={{color:'#34C759',fontWeight:700}}>+{totalRevenue.toLocaleString('fr-FR')} F</span>
          </div>
          <AreaChart data={data.revenueTimeline} color="#34C759"/>
        </div>
      </div>

      {/* Agent Metrics */}
      {agentData && (
        <div style={{marginTop:20}}>
          <h3 className="adst" style={{marginBottom:12}}>🤖 Performance des agents</h3>
          <div className="adg" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:16}}>
            <div className="adc"><div className="adcl">Exécutions totales</div><div className="adcv" style={{color:'#1a1a2e'}}>{agentData.totalRuns||0}</div></div>
            <div className="adc"><div className="adcl">Agents enregistrés</div><div className="adcv" style={{color:'#5856D6'}}>{(agentData.agents||[]).length}</div></div>
            <div className="adc"><div className="adcl">Taux de succès</div><div className="adcv" style={{color:'#34C759'}}>
              {(()=>{const t=agentData.totalRuns||0;const s=Object.values(agentData.runsPerAgent||{}).reduce((a,b)=>a+b.success,0);return t?s+'%':'-'})()}
            </div></div>
          </div>
          <div className="adg" style={{gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
            {(agentData.agents||[]).map(agent => {
              const ar = agentData.runsPerAgent[agent.id] || {};
              const rate = ar.total ? Math.round(ar.success/ar.total*100) : 0;
              const colors = ['#3B82F6','#6366F1','#B45309','#16A34A','#EA580C','#7C3AED','#A855F7','#059669','#CA8A04'];
              const ci = agent.id ? agent.id.charCodeAt(0)%colors.length : 0;
              const col = colors[ci];
              return (
                <div key={agent.id} className="adc" style={{padding:14,borderLeft:`3px solid ${col}`}}>
                  <div style={{fontWeight:700,fontSize:'.8rem',color:'#1a1a1a',marginBottom:2}}>{agent.name || agent.type}</div>
                  <div style={{fontSize:'.65rem',color:'#8e8e93',marginBottom:8}}>{agent.type} · {agent.status}</div>
                  <div style={{display:'flex',gap:12}}>
                    <div><span style={{fontWeight:700,fontSize:'1rem'}}>{ar.total||agent.total_runs||0}</span><span style={{fontSize:'.6rem',color:'#8e8e93',marginLeft:3}}>runs</span></div>
                    <div><span style={{fontWeight:700,fontSize:'1rem',color:'#34C759'}}>{ar.success||agent.success_count||0}</span><span style={{fontSize:'.6rem',color:'#8e8e93',marginLeft:3}}>ok</span></div>
                    {ar.avgDuration > 0 && <div><span style={{fontWeight:700,fontSize:'1rem',color:'#FF9500'}}>{(ar.avgDuration/1000).toFixed(1)}s</span><span style={{fontSize:'.6rem',color:'#8e8e93',marginLeft:3}}>moy</span></div>}
                  </div>
                  {ar.total > 0 && (
                    <div className="adcbar" style={{marginTop:8,height:4,borderRadius:2}}>
                      <div style={{width:`${rate}%`,background:`linear-gradient(90deg,${col},${col}88)`,height:4,borderRadius:2,transition:'width .8s ease'}}/>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="adg" style={{gridTemplateColumns:'1fr 1fr',marginTop:0}}>
        <div className="adc" style={{padding:20}}>
          <div className="adcl" style={{marginBottom:8}}>Souscriptions abonnement</div>
          <GradientBar data={data.conversionTimeline} colors={['#FF6B35','#FF8E53','#FFA726','#FFCC02','#FF6B35','#FF8E53']}/>
        </div>
        <div className="adc" style={{padding:20}}>
          <div className="adcl" style={{marginBottom:12}}>Répartition des abonnements</div>
          {data.subscriptionBreakdown?.length > 0 ? (
            <div style={{display:'flex',flexDirection:'column',gap:10,paddingTop:4}}>
              {data.subscriptionBreakdown.map((d, i) => {
                const total = data.subscriptionBreakdown.reduce((s,x)=>s+x.value,0);
                const pct = ((d.value/total)*100).toFixed(0);
                const colors = ['#1a1a2e','#007AFF','#FF9500','#34C759'];
                return (
                  <div key={i} style={{animation:`fIn ${.2+i*.1}s ease`}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'.78rem',marginBottom:4}}>
                      <span style={{fontWeight:600}}>{d.label}</span>
                      <span style={{color:'#666'}}>{d.value} <span style={{color:'#999',fontSize:'.7rem'}}>({pct}%)</span></span>
                    </div>
                    <div className="adcbar" style={{height:8,borderRadius:4,background:'#f0f0f0'}}>
                      <div style={{width:`${pct}%`,background:`linear-gradient(90deg,${colors[i%colors.length]},${colors[(i+1)%colors.length]})`,
                        height:8,borderRadius:4,transition:'width .8s ease'}}/>
                    </div>
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
