'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const STATUS_COLORS = { idle:'#8e8e93', running:'#007AFF', waiting:'#FF9500', retrying:'#FF9500', success:'#34C759', failed:'#FF3B30', paused:'#5856D6' };

export default function MonitoringPage() {
  const [agents, setAgents] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: a } = await supabase.from('agents').select('*').order('updated_at', { ascending: false });
      setAgents(a || []);
      const { data: r } = await supabase.from('agent_runs').select('*, agents(name)').order('started_at', { ascending: false }).limit(50);
      setRuns(r || []);
      setLoading(false);
    };
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="adpagehead">
        <div>
          <h2>📡 Live Monitoring</h2>
          <p>Surveillance en temps réel des agents</p>
        </div>
        <div style={{flex:1}}/>
        <span style={{fontSize:'.75rem',color:'#8e8e93'}}>🔄 Mise à jour auto toutes les 5s</span>
      </div>

      {loading ? <div className="adld"><div className="adsp"/></div> : (
        <>
          {/* Agent Status Cards */}
          <div className="adg" style={{gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))'}}>
            {['running','idle','success','failed'].map(st => {
              const count = agents.filter(a => a.status === st).length;
              return (
                <div key={st} className="adc" style={{borderLeft:`3px solid ${STATUS_COLORS[st]}`}}>
                  <div className="adcl">{st === 'running' ? 'En cours' : st === 'idle' ? 'Inactifs' : st === 'success' ? 'Succès' : 'Échecs'}</div>
                  <div className="adcv" style={{fontSize:'1.6rem',color:STATUS_COLORS[st]}}>{count}</div>
                </div>
              );
            })}
          </div>

          {/* Agent Cards */}
          <div className="adg" style={{gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))'}}>
            {agents.map(agent => (
              <div key={agent.id} className="adc" style={{padding:16}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                  <strong style={{fontSize:'.85rem'}}>{agent.name}</strong>
                  <span className="adpill" style={{background: STATUS_COLORS[agent.status] + '20', color: STATUS_COLORS[agent.status]}}>
                    <span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:STATUS_COLORS[agent.status],marginRight:4}}/>
                    {agent.status === 'running' ? 'En cours' : agent.status === 'paused' ? 'Pause' : agent.status === 'failed' ? 'Échec' : agent.status === 'success' ? 'Succès' : 'Inactif'}
                  </span>
                </div>
                <div style={{display:'flex',gap:16,fontSize:'.75rem',color:'#8e8e93',marginBottom:8}}>
                  <span>🔄 {agent.total_runs || 0}</span>
                  <span>✅ {agent.success_count || 0}</span>
                  <span>❌ {agent.error_count || 0}</span>
                </div>
                <div className="adcbar"><div style={{width: agent.total_runs ? ((agent.success_count||0)/agent.total_runs*100)+'%' : '0%', background: '#34C759', height:6, borderRadius:3}}/></div>
                {agent.last_run_at && <div style={{fontSize:'.68rem',color:'#8e8e93',marginTop:8}}>Dernière exécution : {new Date(agent.last_run_at).toLocaleString('fr-FR')}</div>}
              </div>
            ))}
          </div>

          {/* Recent Runs */}
          <div className="adsec">
            <h3 className="adst">Dernières exécutions</h3>
            <div className="adtw">
              <table className="adtabl">
                <thead><tr><th>Agent</th><th>Statut</th><th>Début</th><th>Durée</th><th>Erreur</th></tr></thead>
                <tbody>
                  {runs.length === 0 ? (
                    <tr><td colSpan={5}><div className="adem">Aucune exécution</div></td></tr>
                  ) : runs.map(run => (
                    <tr key={run.id}>
                      <td><strong>{run.agents?.name || '—'}</strong></td>
                      <td><span className="adpill" style={{background: (run.status === 'success' ? '#34C759' : run.status === 'failed' ? '#FF3B30' : '#007AFF') + '18', color: run.status === 'success' ? '#34C759' : run.status === 'failed' ? '#FF3B30' : '#007AFF'}}>
                        {run.status === 'success' ? '✅ Succès' : run.status === 'failed' ? '❌ Échec' : run.status === 'running' ? '🔄 En cours' : '⏹️ Annulé'}
                      </span></td>
                      <td style={{fontSize:'.75rem',color:'#8e8e93'}}>{new Date(run.started_at).toLocaleString('fr-FR')}</td>
                      <td style={{fontSize:'.75rem'}}>{run.duration_ms ? (run.duration_ms / 1000).toFixed(1) + 's' : '—'}</td>
                      <td style={{fontSize:'.75rem',color:'#FF3B30',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis'}}>{run.error || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
