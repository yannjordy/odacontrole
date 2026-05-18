'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const AGENT_COLORS = { contact:'#16A34A', whatsapp_followup:'#059669', onboarding:'#EA580C' };

export default function WhatsAppPage() {
  const [messages, setMessages] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total:0, sent:0, delivered:0, replied:0, failed:0 });
  const [agentStats, setAgentStats] = useState({});

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: m } = await supabase.from('whatsapp_messages').select('*, leads(full_name,phone)').order('sent_at', { ascending: false }).limit(100);
      setMessages(m || []);
      const { data: l } = await supabase.from('leads').select('id,full_name,phone,status').order('created_at', { ascending: false });
      setLeads(l || []);

      const s = { total:0, sent:0, delivered:0, replied:0, failed:0 };
      (m || []).forEach(msg => { s.total++; if (s[msg.status] !== undefined) s[msg.status]++; });
      setStats(s);

      const { data: runs } = await supabase.from('agent_runs').select('agent_id,status,created_at').gte('created_at', new Date(Date.now()-7*86400000).toISOString());
      const aStats = {};
      (runs || []).forEach(r => {
        if (!aStats[r.agent_id]) aStats[r.agent_id] = { total:0, success:0, failed:0 };
        aStats[r.agent_id].total++;
        if (r.status === 'success') aStats[r.agent_id].success++;
        else if (r.status === 'failed') aStats[r.agent_id].failed++;
      });
      setAgentStats(aStats);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function sendMessage() {
    const phone = prompt('Téléphone du destinataire (ex: +2376XXXXXXXX) :');
    if (!phone) return;
    const msg = prompt('Message à envoyer :');
    if (!msg) return;
    await supabase.from('whatsapp_messages').insert({
      lead_id: null,
      direction: 'outbound',
      message_type: 'text',
      content: { body: msg },
      status: 'sent',
    });
    toast('Message envoyé (simulation)', 'success');
    fetchData();
  }

  function toast(m, t) {
    const d = document.createElement('div'); d.className = 'adtoast ' + t;
    d.textContent = m; document.body.appendChild(d);
    setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 300) }, 3000);
  }

  return (
    <div>
      <div className="adpagehead">
        <div>
          <h2>💬 WhatsApp Center</h2>
          <p>Centre de communication avec les vendeurs</p>
        </div>
        <div style={{flex:1}}/>
        <button className="adbtn adbtn-primary" onClick={sendMessage}>✏️ Nouveau message</button>
      </div>

      {/* Stats */}
      <div className="adg">
        <div className="adc"><div className="adcl">Total messages</div><div className="adcv">{stats.total}</div></div>
        <div className="adc" style={{borderLeft:'3px solid #007AFF'}}><div className="adcl">Envoyés</div><div className="adcv" style={{color:'#007AFF'}}>{stats.sent}</div></div>
        <div className="adc" style={{borderLeft:'3px solid #34C759'}}><div className="adcl">Reçus (réponses)</div><div className="adcv" style={{color:'#34C759'}}>{stats.replied}</div></div>
        <div className="adc" style={{borderLeft:'3px solid #FF3B30'}}><div className="adcl">Échoués</div><div className="adcv" style={{color:'#FF3B30'}}>{stats.failed}</div></div>
      </div>

      {/* Agent Activity */}
      <div className="adg" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:16}}>
        {[
          { key: 'contact', label: 'Marc — Contact', emoji: '💬', color: '#16A34A' },
          { key: 'whatsapp_followup', label: 'Yann — Suivi', emoji: '📱', color: '#059669' },
          { key: 'onboarding', label: 'Fatou — Onboarding', emoji: '📋', color: '#EA580C' },
        ].map(a => {
          const st = agentStats[a.key] || {};
          return (
            <div key={a.key} className="adc" style={{borderLeft:`3px solid ${a.color}`,padding:14}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                <span style={{fontSize:'1.2rem'}}>{a.emoji}</span>
                <div>
                  <div style={{fontWeight:700,fontSize:'.75rem'}}>{a.label}</div>
                  <div style={{fontSize:'.65rem',color:'#8e8e93'}}>Activité 7 jours</div>
                </div>
              </div>
              <div style={{display:'flex',gap:16,marginTop:4}}>
                <div><span style={{fontSize:'1.1rem',fontWeight:700}}>{st.total||0}</span><span style={{fontSize:'.65rem',color:'#8e8e93',marginLeft:4}}>runs</span></div>
                <div><span style={{fontSize:'1.1rem',fontWeight:700,color:'#34C759'}}>{st.success||0}</span><span style={{fontSize:'.65rem',color:'#8e8e93',marginLeft:4}}>succès</span></div>
              </div>
            </div>
          );
        })}
      </div>

      {loading ? <div className="adld"><div className="adsp"/></div> : (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          {/* Leads List */}
          <div className="adsec">
            <h3 className="adst">Contacts vendeurs</h3>
            <p className="adsd">Liste des leads disponibles pour campagne WhatsApp</p>
            <div className="adtw">
              <table className="adtabl">
                <thead><tr><th>Nom</th><th>Téléphone</th><th>Statut</th><th>Action</th></tr></thead>
                <tbody>
                  {leads.length === 0 ? (
                    <tr><td colSpan={4}><div className="adem">Aucun contact</div></td></tr>
                  ) : leads.slice(0, 10).map(lead => (
                    <tr key={lead.id}>
                      <td><strong>{lead.full_name || '—'}</strong></td>
                      <td style={{fontSize:'.78rem'}}>{lead.phone}</td>
                      <td><span className="adpill">{lead.status}</span></td>
                      <td>
                        <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g,'')}`} target="_blank" rel="noopener noreferrer"
                          className="adbtn adbtn-sm adbtn-success" style={{textDecoration:'none'}}>
                          💬 WhatsApp
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Messages Timeline */}
          <div className="adsec">
            <h3 className="adst">Messages récents</h3>
            <p className="adsd">Derniers échanges WhatsApp</p>
            <div className="adtw" style={{maxHeight:500,overflowY:'auto'}}>
              {messages.length === 0 ? (
                <div className="adem" style={{padding:40}}><div className="ademi">💬</div><div className="ademt">Aucun message</div><div className="ademd">Les messages WhatsApp apparaîtront ici</div></div>
              ) : messages.map(msg => (
                <div key={msg.id} style={{padding:'12px 16px',borderBottom:'1px solid #f0f0f0',display:'flex',gap:12,alignItems:'flex-start'}}>
                  <div style={{fontSize:'1.2rem'}}>{msg.direction === 'outbound' ? '📤' : '📥'}</div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <strong style={{fontSize:'.82rem'}}>{msg.leads?.full_name || 'Inconnu'}</strong>
                      <span style={{fontSize:'.68rem',color:'#8e8e93'}}>{new Date(msg.sent_at).toLocaleString('fr-FR')}</span>
                    </div>
                    <div style={{fontSize:'.78rem',color:'#555',marginBottom:4}}>{msg.content?.body || JSON.stringify(msg.content)}</div>
                    <span className="adpill" style={{background: msg.status === 'sent' ? '#007AFF18' : msg.status === 'delivered' ? '#34C75918' : msg.status === 'read' ? '#5856D618' : '#FF3B3018', color: msg.status === 'sent' ? '#007AFF' : msg.status === 'delivered' ? '#34C759' : msg.status === 'read' ? '#5856D6' : '#FF3B30', fontSize:'.65rem'}}>
                      {msg.status === 'sent' ? '📤 Envoyé' : msg.status === 'delivered' ? '✅ Livré' : msg.status === 'read' ? '👁️ Lu' : '❌ Échec'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
