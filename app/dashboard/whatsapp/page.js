'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRole } from '../RoleContext';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function toast(msg, type = 'success') {
  const d = document.createElement('div');
  d.className = 'adtoast ' + type;
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => {
    d.style.opacity = '0';
    setTimeout(() => d.remove(), 300);
  }, 3000);
}

export default function WhatsAppPage() {
  const { isAdmin } = useRole();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, delivered: 0, replied: 0, failed: 0 });
  const [agentStats, setAgentStats] = useState({});

  const [waStatus, setWaStatus] = useState('checking');
  const [waQr, setWaQr] = useState(null);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [sendForm, setSendForm] = useState({ number: '', message: '' });
  const pollRef = useRef(null);

  useEffect(() => {
    fetchData();
    fetchWhatsAppStatus();
    pollRef.current = setInterval(fetchWhatsAppStatus, 3000);
    return () => clearInterval(pollRef.current);
  }, []);

  async function fetchWhatsAppStatus() {
    try {
      const res = await fetch('/api/whatsapp?endpoint=status');
      const data = await res.json();
      setWaStatus(data.status || 'offline');
      if (data.qr) setWaQr(data.qr);
      else if (data.status === 'scan_qr') {
        const qrRes = await fetch('/api/whatsapp?endpoint=qr');
        const qrData = await qrRes.json();
        if (qrData.qr) setWaQr(qrData.qr);
      }
    } catch {
      setWaStatus('offline');
    }
  }

  async function regenerateQr() {
    setGeneratingQr(true);
    setWaQr(null);
    try {
      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      toast('Nouveau QR code en cours de génération...');
      setTimeout(fetchWhatsAppStatus, 3000);
    } catch (err) {
      toast('Erreur: ' + err.message, 'error');
    }
    setGeneratingQr(false);
  }

  async function fetchData() {
    setLoading(true);
    try {
      const { data: m } = await supabase
        .from('whatsapp_messages')
        .select('*, leads(full_name,phone)')
        .order('sent_at', { ascending: false })
        .limit(100);
      setMessages(m || []);
      const { data: l } = await supabase
        .from('leads')
        .select('id,full_name,phone,status')
        .order('created_at', { ascending: false });
      setLeads(l || []);

      const s = { total: 0, sent: 0, delivered: 0, replied: 0, failed: 0 };
      (m || []).forEach(msg => { s.total++; if (s[msg.status] !== undefined) s[msg.status]++; });
      setStats(s);

      const { data: runs } = await supabase
        .from('agent_runs')
        .select('agent_id,status,created_at')
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());
      const aStats = {};
      (runs || []).forEach(r => {
        if (!aStats[r.agent_id]) aStats[r.agent_id] = { total: 0, success: 0, failed: 0 };
        aStats[r.agent_id].total++;
        if (r.status === 'success') aStats[r.agent_id].success++;
        else if (r.status === 'failed') aStats[r.agent_id].failed++;
      });
      setAgentStats(aStats);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function sendRealMessage(e) {
    e.preventDefault();
    if (!sendForm.number || !sendForm.message) return;
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          number: sendForm.number,
          message: sendForm.message,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast('Message envoyé via WhatsApp');
        setSendForm({ number: '', message: '' });
        await supabase.from('whatsapp_messages').insert({
          direction: 'outbound',
          message_type: 'text',
          content: { body: sendForm.message },
          status: 'sent',
        });
        fetchData();
      } else {
        toast(data.error || 'Erreur envoi', 'error');
      }
    } catch (err) {
      toast('Erreur: ' + err.message, 'error');
    }
  }

  const statusBadge = (status) => {
    const map = {
      connected: { label: '✅ Connecté', color: '#34C759' },
      scan_qr: { label: '📱 Scan QR', color: '#FF9500' },
      disconnected: { label: '❌ Déconnecté', color: '#FF3B30' },
      auth_failure: { label: '🔒 Échec auth', color: '#FF3B30' },
      checking: { label: '⏳ Vérification...', color: '#8e8e93' },
      offline: { label: '⚫ Serveur off', color: '#8e8e93' },
    };
    const m = map[status] || { label: status, color: '#8e8e93' };
    return <span style={{ color: m.color, fontWeight: 600, fontSize: '.85rem' }}>{m.label}</span>;
  };

  return (
    <div>
      <div className="adpagehead">
        <div>
          <h2>💬 WhatsApp Center</h2>
          <p>Connectez votre WhatsApp pour envoyer des messages aux vendeurs</p>
        </div>
        <div style={{ flex: 1 }} />
        {isAdmin && (
          <button className="adbtn adbtn-primary" onClick={() => document.getElementById('sendModal').style.display = 'flex'}>
            ✏️ Nouveau message
          </button>
        )}
      </div>

      {/* Status card */}
      <div className="adc" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: waStatus === 'connected' ? '#34C75918' : waStatus === 'scan_qr' ? '#FF950018' : '#FF3B3018',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
            }}>
              {waStatus === 'connected' ? '✅' : waStatus === 'scan_qr' ? '📱' : '⚫'}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.95rem' }}>WhatsApp Web</div>
              <div style={{ marginTop: 4 }}>{statusBadge(waStatus)}</div>
            </div>
          </div>
        </div>

        {waStatus === 'scan_qr' && waQr && (
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <div style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: 8 }}>Scannez ce QR code avec WhatsApp</div>
            <div style={{
              display: 'inline-flex', padding: 20, background: 'white',
              borderRadius: 12, border: '2px solid #e5e5e5',
            }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(waQr)}`}
                alt="QR Code" width={250} height={250} style={{ borderRadius: 8 }}
              />
            </div>
            <div style={{ marginTop: 12, fontSize: '.78rem', color: '#8e8e93' }}>
              Ouvrez WhatsApp {'>'} Menu {'>'} Appareils liés {'>'} Scanner le code
            </div>
          </div>
        )}

        {waStatus === 'disconnected' && (
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <div style={{ fontSize: '.9rem', fontWeight: 600, color: '#555', marginBottom: 12 }}>
              WhatsApp déconnecté. Générez un nouveau QR pour reconnecter.
            </div>
            <button className="adbtn adbtn-primary" onClick={regenerateQr} disabled={generatingQr}>
              {generatingQr ? '⏳ Génération...' : '📱 Générer le QR code'}
            </button>
          </div>
        )}

        {waStatus === 'connected' && (
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
            <button className="adbtn adbtn-ghost" onClick={regenerateQr} disabled={generatingQr}
              style={{ color: '#FF3B30' }}>
              🔄 Changer d'appareil (générer un nouveau QR)
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="adg">
        <div className="adc"><div className="adcl">Total messages</div><div className="adcv">{stats.total}</div></div>
        <div className="adc" style={{ borderLeft: '3px solid #007AFF' }}>
          <div className="adcl">Envoyés</div>
          <div className="adcv" style={{ color: '#007AFF' }}>{stats.sent}</div>
        </div>
        <div className="adc" style={{ borderLeft: '3px solid #34C759' }}>
          <div className="adcl">Reçus</div>
          <div className="adcv" style={{ color: '#34C759' }}>{stats.replied}</div>
        </div>
        <div className="adc" style={{ borderLeft: '3px solid #FF3B30' }}>
          <div className="adcl">Échoués</div>
          <div className="adcv" style={{ color: '#FF3B30' }}>{stats.failed}</div>
        </div>
      </div>

      {loading ? <div className="adld"><div className="adsp" /></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Leads */}
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
                      <td style={{ fontSize: '.78rem' }}>{lead.phone}</td>
                      <td><span className="adpill">{lead.status}</span></td>
                      <td>
                        <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank" rel="noopener noreferrer"
                          className="adbtn adbtn-sm adbtn-success"
                          style={{ textDecoration: 'none' }}>💬 WhatsApp</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Messages */}
          <div className="adsec">
            <h3 className="adst">Messages récents</h3>
            <p className="adsd">Derniers échanges WhatsApp</p>
            <div className="adtw" style={{ maxHeight: 500, overflowY: 'auto' }}>
              {messages.length === 0 ? (
                <div className="adem" style={{ padding: 40 }}>
                  <div className="ademi">💬</div>
                  <div className="ademt">Aucun message</div>
                  <div className="ademd">Les messages WhatsApp apparaîtront ici</div>
                </div>
              ) : messages.map(msg => (
                <div key={msg.id} style={{
                  padding: '12px 16px', borderBottom: '1px solid #f0f0f0',
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                }}>
                  <div style={{ fontSize: '1.2rem' }}>
                    {msg.direction === 'outbound' ? '📤' : '📥'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <strong style={{ fontSize: '.82rem' }}>{msg.leads?.full_name || 'Inconnu'}</strong>
                      <span style={{ fontSize: '.68rem', color: '#8e8e93' }}>
                        {new Date(msg.sent_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <div style={{ fontSize: '.78rem', color: '#555', marginBottom: 4 }}>
                      {msg.content?.body || JSON.stringify(msg.content)}
                    </div>
                    <span className="adpill" style={{
                      background: msg.status === 'sent' ? '#007AFF18' : msg.status === 'delivered' ? '#34C75918' : msg.status === 'read' ? '#5856D618' : '#FF3B3018',
                      color: msg.status === 'sent' ? '#007AFF' : msg.status === 'delivered' ? '#34C759' : msg.status === 'read' ? '#5856D6' : '#FF3B30',
                      fontSize: '.65rem',
                    }}>
                      {msg.status === 'sent' ? '📤 Envoyé' : msg.status === 'delivered' ? '✅ Livré' : msg.status === 'read' ? '👁️ Lu' : '❌ Échec'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Send modal */}
      <div id="sendModal" style={{
        display: 'none', position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
      }} onClick={e => { if (e.target === e.currentTarget) e.currentTarget.style.display = 'none' }}>
        <form onSubmit={sendRealMessage} style={{
          background: 'white', borderRadius: 16, padding: 28, width: '90%', maxWidth: 440,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}>
          <h3 style={{ marginBottom: 8, fontWeight: 700 }}>Envoyer un message WhatsApp</h3>
          {waStatus !== 'connected' && (
            <div style={{
              padding: '10px 14px', background: '#FFF3CD', borderRadius: 8,
              marginBottom: 16, fontSize: '.8rem', color: '#856404',
            }}>
              ⚠️ WhatsApp n'est pas connecté. Le message sera enregistré mais pas envoyé en temps réel.
            </div>
          )}
          <label style={{ fontSize: '.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>
            Numéro (ex: 2376XXXXXXXX)
          </label>
          <input
            value={sendForm.number}
            onChange={e => setSendForm({ ...sendForm, number: e.target.value })}
            placeholder="237650000000"
            style={{
              width: '100%', padding: '12px 16px', border: '2px solid #e5e5e5',
              borderRadius: 10, fontSize: '.9rem', marginBottom: 16, outline: 'none',
            }}
          />
          <label style={{ fontSize: '.8rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>
            Message
          </label>
          <textarea
            value={sendForm.message}
            onChange={e => setSendForm({ ...sendForm, message: e.target.value })}
            rows={4}
            placeholder="Bonjour, nous avons une offre spéciale pour vous..."
            style={{
              width: '100%', padding: '12px 16px', border: '2px solid #e5e5e5',
              borderRadius: 10, fontSize: '.9rem', marginBottom: 20, outline: 'none',
              resize: 'vertical', fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => document.getElementById('sendModal').style.display = 'none'}
              style={{
                padding: '12px 24px', border: '2px solid #e5e5e5', borderRadius: 10,
                background: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '.85rem',
              }}>Annuler</button>
            <button type="submit"
              style={{
                padding: '12px 24px', border: 'none', borderRadius: 10,
                background: waStatus === 'connected' ? '#25D366' : '#8e8e93',
                color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '.85rem',
              }}>
              {waStatus === 'connected' ? '📤 Envoyer via WhatsApp' : '💾 Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
