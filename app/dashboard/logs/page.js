'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const SEVERITY_COLORS = { info: '#007AFF', warning: '#FF9500', error: '#FF3B30', critical: '#DC2626' };

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef(null);

  async function fetchLogs() {
    let q = supabase.from('audit_logs').select('*, agents(name)').order('created_at', { ascending: false }).limit(200);
    if (filter !== 'all') q = q.eq('severity', filter);
    const { data } = await q;
    if (data) setLogs(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchLogs();
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, 10000);
      return () => clearInterval(intervalRef.current);
    }
  }, [filter, autoRefresh]);

  useEffect(() => {
    const sub = supabase.channel('audit_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, payload => {
        setLogs(prev => [payload.new, ...prev].slice(0, 200));
      })
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  const filtered = logs.filter(l => {
    if (search) {
      const q = search.toLowerCase();
      const details = l.details ? JSON.stringify(l.details).toLowerCase() : '';
      return (l.action || '').toLowerCase().includes(q) || (l.agents?.name || '').toLowerCase().includes(q) || details.includes(q);
    }
    return true;
  });

  return (
    <div>
      <div className="adpagehead" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2>📋 Audit Logs</h2>
          <p>Journal de toutes les actions du système — {filtered.length} entrée(s)</p>
        </div>
        <div style={{ flex: 1 }} />
        <input className="adsrch" style={{ maxWidth: 180 }} placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="adsrch" style={{ maxWidth: 130 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">Tous niveaux</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="critical">Critical</option>
        </select>
        <button className="adbtn adbtn-ghost" onClick={() => setAutoRefresh(!autoRefresh)} style={{ fontSize: 11 }}>
          {autoRefresh ? '🟢 Auto' : '🔴 Auto'}
        </button>
        <button className="adbtn adbtn-ghost" onClick={fetchLogs}>🔄</button>
      </div>

      {loading ? <div className="adld"><div className="adsp" /></div> : (
        <div className="adtw" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div className="adem" style={{ padding: 40 }}>
              <div className="ademi">📋</div>
              <div className="ademt">Aucun log</div>
              <div className="ademd">Les actions du système seront journalisées ici</div>
            </div>
          ) : (
            <table className="adtabl">
              <thead>
                <tr>
                  <th style={{ width: 150 }}>Date</th>
                  <th style={{ width: 100 }}>Agent</th>
                  <th style={{ width: 140 }}>Action</th>
                  <th style={{ width: 70 }}>Niveau</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => {
                  const isError = log.severity === 'error' || log.severity === 'critical';
                  const details = log.details;
                  const detailsStr = details ? JSON.stringify(details) : '';
                  return (
                    <tr key={log.id}
                      onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                      style={{
                        cursor: 'pointer',
                        background: isError ? '#FEF2F2' : (expanded === log.id ? '#f8f9fa' : undefined),
                        transition: 'background .15s',
                      }}>
                      <td style={{ fontSize: '.7rem', color: '#8e8e93', whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString('fr-FR')}
                      </td>
                      <td><strong style={{ fontSize: '.8rem' }}>{log.agents?.name || 'Système'}</strong></td>
                      <td>
                        <span style={{
                          fontSize: '.78rem', fontWeight: 600, fontFamily: 'monospace',
                          color: isError ? '#DC2626' : '#333',
                        }}>
                          {isError && '⚠️ '}{log.action}
                        </span>
                      </td>
                      <td>
                        <span className="adpill" style={{
                          background: (SEVERITY_COLORS[log.severity] || '#999') + '18',
                          color: SEVERITY_COLORS[log.severity] || '#999',
                          fontSize: '.65rem',
                        }}>
                          {log.severity}
                        </span>
                      </td>
                      <td style={{ fontSize: '.72rem', color: '#8e8e93', maxWidth: 300 }}>
                        {details ? (
                          expanded === log.id ? (
                            <pre style={{
                              margin: 0, fontSize: '.65rem', color: '#555', whiteSpace: 'pre-wrap',
                              maxHeight: 200, overflowY: 'auto', background: '#f5f5f5', padding: 8, borderRadius: 6,
                            }}>
                              {JSON.stringify(details, null, 2)}
                            </pre>
                          ) : (
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap' }}>
                              {detailsStr.slice(0, 100)}{detailsStr.length > 100 ? '...' : ''}
                            </span>
                          )
                        ) : (
                          <span style={{ color: '#ccc' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
