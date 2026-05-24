'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SvgIcon } from '../../../lib/icons';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PAGE_CSS = `
.campaign-header{margin-bottom:28px}
.campaign-title{font-size:22px;font-weight:700;letter-spacing:-0.02em;display:flex;align-items:center;gap:10px}
.campaign-sub{font-size:13px;color:#6B7280;margin-top:2px}

.campaign-actions{display:flex;gap:10px;margin-bottom:28px;flex-wrap:wrap;align-items:center}
.campaign-mode-group{display:flex;gap:3px;background:#F3F4F6;padding:3px;border-radius:10px}
.campaign-mode-btn{padding:7px 16px;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:12px;font-family:inherit;transition:all .15s}
.campaign-mode-btn.active{background:#fff;color:#111827;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.campaign-mode-btn:not(.active){background:transparent;color:#6B7280}
.campaign-mode-btn:not(.active):hover{color:#374151}

.campaign-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-size:13px;font-family:inherit;transition:all .15s}
.campaign-btn.primary{background:#3B82F6;color:#fff;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.campaign-btn.primary:hover{background:#2563EB}
.campaign-btn.primary:disabled{background:#E5E7EB;color:#9CA3AF;cursor:not-allowed;box-shadow:none}
.campaign-btn.outline{background:#fff;color:#374151;border:1.5px solid #E5E7EB}
.campaign-btn.outline:hover{border-color:#D1D5DB;background:#F9FAFB}
.campaign-btn.danger{background:#FEF2F2;color:#ef4444;border:1.5px solid #ef4444}
.campaign-btn.danger:hover{background:#FEE2E2}

.campaign-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:28px}
.campaign-kpi-card{background:#fff;border-radius:12px;border:0.5px solid #E5E7EB;padding:20px;position:relative;overflow:hidden;transition:box-shadow .2s,transform .15s}
.campaign-kpi-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.07);transform:translateY(-1px)}
.campaign-kpi-icon{position:absolute;top:16px;right:16px;opacity:0.1;pointer-events:none}
.campaign-kpi-label{font-size:10px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;margin-bottom:8px}
.campaign-kpi-value{font-size:28px;font-weight:700;letter-spacing:-0.03em;line-height:1}

.campaign-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px}
.campaign-panel{background:#fff;border-radius:12px;border:0.5px solid #E5E7EB;padding:24px}
.campaign-panel-title{font-size:14px;font-weight:600;margin-bottom:18px;display:flex;align-items:center;gap:8px}

.funnel-track{display:flex;align-items:center;gap:4px;margin:20px 0 6px}
.funnel-seg{height:10px;border-radius:5px;transition:flex .5s ease}

.funnel-labels{display:flex;justify-content:space-between;margin-top:4px}
.funnel-labels span{font-size:10px;font-weight:600}

.stat-row{display:flex;justify-content:space-between;padding:10px 0}
.stat-row+ .stat-row{border-top:0.5px solid #F3F4F6}
.stat-label{font-size:13px;color:#6B7280}
.stat-value{font-size:13px;font-weight:700}

.msg-section{background:#fff;border-radius:12px;border:0.5px solid #E5E7EB;padding:24px}
.msg-thread{display:flex;flex-direction:column;gap:6px}
.msg-item{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:10px;font-size:12px;transition:background .15s}
.msg-item.inbound{background:#F0FDF4;border-left:3px solid #22C55E}
.msg-item.outbound{background:#F9FAFB;border-left:3px solid #D1D5DB}
.msg-item:hover{filter:brightness(0.97)}
.msg-body{flex:1;min-width:0}
.msg-text{color:#374151;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
.msg-meta{display:flex;gap:6px;margin-top:4px}
.msg-time{color:#9CA3AF;font-size:10px;flex-shrink:0;white-space:nowrap;margin-top:2px}
.pill{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600}
.pill-green{background:#DCFCE7;color:#166534}
.pill-gray{background:#F3F4F6;color:#6B7280}
.pill-blue{background:#E5E7EB;color:#374151}

.empty-state{color:#9CA3AF;font-size:13px;padding:32px 0;text-align:center}
.loading-state{display:flex;align-items:center;justify-content:center;min-height:60vh;color:#9CA3AF;gap:10px;font-size:14px}

@media(max-width:900px){
  .campaign-kpis{grid-template-columns:repeat(3,1fr)}
  .campaign-row{grid-template-columns:1fr}
}
@media(max-width:600px){
  .campaign-kpis{grid-template-columns:repeat(2,1fr)}
}
`;

const KPI_CONFIG = [
  { key: 'total', label: 'Leads totaux', color: '#3B82F6', icon: 'users' },
  { key: 'contacted', label: 'Contactés', color: '#F59E0B', icon: 'phone' },
  { key: 'consented', label: 'Consentements', color: '#22C55E', icon: 'check' },
  { key: 'validated', label: 'Validés', color: '#8B5CF6', icon: 'shield' },
  { key: 'msgsSent', label: 'Messages envoyés', color: '#06B6D4', icon: 'mail' },
];

const FUNNEL = [
  { key: 'total', label: 'Leads', color: '#3B82F6' },
  { key: 'contacted', label: 'Contactés', color: '#F59E0B' },
  { key: 'consented', label: 'Consentements', color: '#22C55E' },
  { key: 'validated', label: 'Validés', color: '#8B5CF6' },
];

export default function CampaignsPage() {
  const [stats, setStats] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [cronActive, setCronActive] = useState(false);
  const [mode, setMode] = useState('contact');
  const cronRef = useRef(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'campaign-css';
    style.textContent = PAGE_CSS;
    if (!document.getElementById('campaign-css')) document.head.appendChild(style);
    loadStats();
    return () => { if (cronRef.current) clearInterval(cronRef.current); };
  }, []);

  async function loadStats() {
    const { data: leads } = await supabase.from('leads').select('status,consent_given');
    const { data: msgs } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    const { data: contactAttempts } = await supabase
      .from('contact_attempts')
      .select('status');

    const total = leads?.length || 0;
    const contacted = leads?.filter(l => l.status !== 'new').length || 0;
    const consented = leads?.filter(l => l.consent_given === true).length || 0;
    const validated = leads?.filter(l => l.status === 'validated').length || 0;
    const msgsSent = contactAttempts?.filter(a => a.status === 'sent').length || 0;

    setStats({ total, contacted, consented, validated, msgsSent });
    setMessages(msgs || []);
    setLoading(false);
  }

  async function handleSendCampaign() {
    setSending(true);
    try {
      const res = await fetch('/api/agents/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, batchSize: 20 }),
      });
      await res.json();
      await loadStats();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  function toggleAutoCampaign() {
    if (cronActive) {
      clearInterval(cronRef.current);
      cronRef.current = null;
      setCronActive(false);
    } else {
      handleSendCampaign();
      cronRef.current = setInterval(handleSendCampaign, 300000);
      setCronActive(true);
    }
  }

  const got = stats || {};
  const maxFunnel = Math.max(got.total || 1, 1);

  function modeLabel(m) {
    return m === 'contact' ? 'Contact' : m === 'followup' ? 'Relance' : 'Marketing';
  }

  if (loading) return <div className="loading-state"><SvgIcon name="refresh" size={20} color="#9CA3AF"/> Chargement…</div>;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1120, margin: '0 auto' }}>
      <div className="campaign-header">
        <h1 className="campaign-title">
          <SvgIcon name="campaign" size={26} color="#3B82F6"/>
          Campagnes WhatsApp
        </h1>
        <p className="campaign-sub">Automatisation, envoi et suivi en temps réel des campagnes agents</p>
      </div>

      <div className="campaign-actions">
        <div className="campaign-mode-group">
          {['contact', 'followup', 'marketing'].map(m => (
            <button key={m}
              className={`campaign-mode-btn${mode === m ? ' active' : ''}`}
              onClick={() => setMode(m)}>
              {modeLabel(m)}
            </button>
          ))}
        </div>
        <button className="campaign-btn primary" disabled={sending} onClick={handleSendCampaign}>
          <SvgIcon name="send" size={15} color={sending ? '#9CA3AF' : '#fff'}/>
          {sending ? 'Envoi en cours…' : `Lancer ${modeLabel(mode).toLowerCase()}`}
        </button>
        <button className={`campaign-btn${cronActive ? ' danger' : ' outline'}`} onClick={toggleAutoCampaign}>
          <SvgIcon name="refresh" size={15} color={cronActive ? '#ef4444' : '#374151'}/>
          {cronActive ? 'Arrêter auto (5 min)' : 'Mode automatique'}
        </button>
        <button className="campaign-btn outline" onClick={loadStats}>
          <SvgIcon name="refresh" size={15} color="#374151"/>
          Rafraîchir
        </button>
      </div>

      <div className="campaign-kpis">
        {KPI_CONFIG.map(k => (
          <div key={k.key} className="campaign-kpi-card">
            <div className="campaign-kpi-icon">
              <SvgIcon name={k.icon} size={24} color={k.color}/>
            </div>
            <div className="campaign-kpi-label">{k.label}</div>
            <div className="campaign-kpi-value" style={{ color: k.color }}>
              {got[k.key] || 0}
            </div>
          </div>
        ))}
      </div>

      <div className="campaign-row">
        <div className="campaign-panel">
          <h2 className="campaign-panel-title">
            <SvgIcon name="trending_up" size={16} color="#3B82F6"/>
            Entonnoir de conversion
          </h2>
          <div className="funnel-track">
            {FUNNEL.map((f, i) => (
              <div key={f.key}
                className="funnel-seg"
                style={{ flex: (got[f.key] || 0) / maxFunnel, background: f.color }}/>
            ))}
          </div>
          <div className="funnel-labels">
            {FUNNEL.map(f => (
              <span key={f.key} style={{ color: f.color }}>{got[f.key] || 0}</span>
            ))}
          </div>
          <div className="funnel-labels" style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 400 }}>
            {FUNNEL.map(f => <span key={f.key}>{f.label}</span>)}
          </div>
        </div>

        <div className="campaign-panel">
          <h2 className="campaign-panel-title">
            <SvgIcon name="info" size={16} color="#F59E0B"/>
            Résumé campagne
          </h2>
          {stats ? (
            <div>
              <div className="stat-row">
                <span className="stat-label">Taux de contact</span>
                <span className="stat-value">{got.total ? Math.round(got.contacted / got.total * 100) : 0}%</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Taux de consentement</span>
                <span className="stat-value" style={{ color: '#22C55E' }}>
                  {got.contacted ? Math.round(got.consented / got.contacted * 100) : 0}%
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Taux de validation</span>
                <span className="stat-value" style={{ color: '#8B5CF6' }}>
                  {got.consented ? Math.round(got.validated / got.consented * 100) : 0}%
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Messages envoyés</span>
                <span className="stat-value" style={{ color: '#06B6D4' }}>{got.msgsSent || 0}</span>
              </div>
            </div>
          ) : (
            <div className="empty-state">En attente de données</div>
          )}
        </div>
      </div>

      <div className="msg-section">
        <h2 className="campaign-panel-title">
          <SvgIcon name="whatsapp" size={16} color="#22C55E"/>
          Derniers messages WhatsApp
          <span className="pill pill-blue" style={{ marginLeft: 4 }}>{messages.length} messages</span>
        </h2>
        {messages.length === 0 ? (
          <div className="empty-state">Aucun message pour le moment</div>
        ) : (
          <div className="msg-thread">
            {messages.map((m, i) => (
              <div key={m.id || i} className={`msg-item ${m.direction === 'inbound' ? 'inbound' : 'outbound'}`}>
                <SvgIcon name={m.direction === 'inbound' ? 'download' : 'send'}
                  size={14} color={m.direction === 'inbound' ? '#22C55E' : '#6B7280'}/>
                <div className="msg-body">
                  <div className="msg-text">{m.content?.body || '(aucun contenu)'}</div>
                  <div className="msg-meta">
                    <span className={`pill ${m.direction === 'inbound' ? 'pill-green' : 'pill-gray'}`}>
                      {m.direction === 'inbound' ? 'Reçu' : 'Envoyé'}
                    </span>
                  </div>
                </div>
                <span className="msg-time">
                  {new Date(m.created_at).toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
