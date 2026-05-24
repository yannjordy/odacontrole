'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SvgIcon } from '../../../lib/icons';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const s = (k) => ({
  page: { padding: '28px 36px', maxWidth: 1120, margin: '0 auto' },
  header: { marginBottom: 28 },
  title: { fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  actions: { display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' },
  btn: (bg, fg, disabled) => ({
    padding: '10px 20px', border: 'none', borderRadius: 10,
    background: disabled ? '#E5E7EB' : bg, color: disabled ? '#9CA3AF' : fg,
    fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 13, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8,
    transition: 'all .15s', boxShadow: disabled ? 'none' : '0 1px 3px rgba(0,0,0,.08)',
  }),
  btnOutline: (active) => ({
    padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
    fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', gap: 8, transition: 'all .15s',
    border: active ? '1.5px solid #ef4444' : '1.5px solid #E5E7EB',
    background: active ? '#FEF2F2' : '#fff',
    color: active ? '#ef4444' : '#374151',
  }),
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 },
  card: {
    background: '#fff', borderRadius: 14, border: '0.5px solid #E5E7EB',
    padding: 20, position: 'relative', overflow: 'hidden',
    transition: 'box-shadow .15s',
  },
  cardLabel: { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 10 },
  cardValue: { fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em' },
  cardIcon: { position: 'absolute', top: 16, right: 16, opacity: 0.12, transform: 'scale(2)', transformOrigin: 'top right' },
  section: {
    background: '#fff', borderRadius: 14, border: '0.5px solid #E5E7EB', padding: 24,
  },
  sectionTitle: { fontSize: 15, fontWeight: 600, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 },
  msgRow: (inbound) => ({
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px',
    background: inbound ? '#F0FDF4' : '#F9FAFB',
    borderRadius: 10, fontSize: 12,
    borderLeft: `3px solid ${inbound ? '#22C55E' : '#D1D5DB'}`,
  }),
  msgTime: { color: '#9CA3AF', fontSize: 10, flexShrink: 0, whiteSpace: 'nowrap' },
  pill: (bg, fg) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
    background: bg, color: fg,
  }),
  empty: { color: '#9CA3AF', fontSize: 13, padding: '24px 0', textAlign: 'center' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#9CA3AF', gap: 10, fontSize: 14 },
  funnel: { display: 'flex', alignItems: 'center', gap: 0, marginTop: 20, marginBottom: 4 },
  funnelBar: (w, c) => ({
    height: 8, borderRadius: 4, background: c, flex: w, marginRight: 3,
    transition: 'flex .5s',
  }),
  funnelLabel: { fontSize: 10, color: '#9CA3AF', display: 'flex', justifyContent: 'space-between', marginTop: 2 },
});

const KPI_CONFIG = [
  { key: 'total', label: 'Leads totaux', color: '#3B82F6', icon: 'users' },
  { key: 'contacted', label: 'Contactés', color: '#F59E0B', icon: 'phone' },
  { key: 'consented', label: 'Consentements', color: '#22C55E', icon: 'check' },
  { key: 'validated', label: 'Validés', color: '#8B5CF6', icon: 'shield' },
  { key: 'msgsSent', label: 'Messages envoyés', color: '#06B6D4', icon: 'mail' },
];

const funnelSteps = [
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
  const funnelW = funnelSteps.map(s => ((got[s.key] || 0) / maxFunnel));

  if (loading) return <div style={s('loading')}><SvgIcon name="refresh" size={20} color="#9CA3AF"/> Chargement...</div>;

  return (
    <div style={s('page')}>
      <div style={s('header')}>
        <h1 style={s('title')}>
          <SvgIcon name="campaign" size={26} color="#3B82F6"/>
          Campagnes WhatsApp
        </h1>
        <p style={s('subtitle')}>Automatisation, envoi et suivi en temps réel des campagnes agents</p>
      </div>

      <div style={s('actions')}>
        <div style={{ display: 'flex', gap: 4, background: '#F3F4F6', padding: 3, borderRadius: 10 }}>
          {[
            { key: 'contact', label: 'Contact' },
            { key: 'followup', label: 'Relance' },
            { key: 'marketing', label: 'Marketing' },
          ].map(m => (
            <button key={m.key} onClick={() => setMode(m.key)}
              style={{
                padding: '7px 16px', border: 'none', borderRadius: 8,
                background: mode === m.key ? '#fff' : 'transparent',
                color: mode === m.key ? '#111827' : '#6B7280',
                fontWeight: 600, cursor: 'pointer', fontSize: 12,
                fontFamily: 'inherit', boxShadow: mode === m.key ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                transition: 'all .15s',
              }}>
              {m.label}
            </button>
          ))}
        </div>
        <button onClick={handleSendCampaign} disabled={sending} style={s('btn', '#3B82F6', '#fff', sending)}>
          <SvgIcon name="send" size={16} color={sending ? '#9CA3AF' : '#fff'}/>
          {sending ? 'Envoi en cours…' : `Lancer ${mode === 'contact' ? 'contact' : mode === 'followup' ? 'relance' : 'marketing'}`}
        </button>
        <button onClick={toggleAutoCampaign} style={s('btnOutline', cronActive)}>
          <SvgIcon name="refresh" size={16} color={cronActive ? '#ef4444' : '#374151'}/>
          {cronActive ? 'Arrêter auto (5 min)' : 'Mode automatique'}
        </button>
        <button onClick={loadStats} style={{ ...s('btn', '#fff', '#374151', false), border: '1.5px solid #E5E7EB' }}>
          <SvgIcon name="refresh" size={16} color="#374151"/>
          Rafraîchir
        </button>
      </div>

      <div style={s('grid')}>
        {KPI_CONFIG.map(k => (
          <div key={k.key} style={s('card')}
            onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.08)'}
            onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}>
            <div style={s('cardIcon')}><SvgIcon name={k.icon} size={24} color={k.color}/></div>
            <div style={s('cardLabel')}>{k.label}</div>
            <div style={{ ...s('cardValue'), color: k.color }}>{got[k.key] || 0}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        <div style={s('section')}>
          <h2 style={s('sectionTitle')}>
            <SvgIcon name="trending_up" size={18} color="#3B82F6"/>
            Entonnoir de conversion
          </h2>
          <div style={s('funnel')}>
            {funnelSteps.map((f, i) => (
              <div key={f.key} style={s('funnelBar', funnelW[i] * 100, f.color)}/>
            ))}
          </div>
          <div style={s('funnelLabel')}>
            {funnelSteps.map(f => (
              <span key={f.key} style={{ color: f.color, fontWeight: 600 }}>{got[f.key] || 0}</span>
            ))}
          </div>
          <div style={s('funnelLabel')}>
            {funnelSteps.map(f => (
              <span key={f.key}>{f.label}</span>
            ))}
          </div>
        </div>

        <div style={s('section')}>
          <h2 style={s('sectionTitle')}>
            <SvgIcon name="info" size={18} color="#F59E0B"/>
            Résumé campagne
          </h2>
          {stats ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#374151' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Taux de contact</span>
                <span style={{ fontWeight: 700 }}>{got.total ? Math.round(got.contacted / got.total * 100) : 0}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Taux de consentement</span>
                <span style={{ fontWeight: 700, color: '#22C55E' }}>{got.contacted ? Math.round(got.consented / got.contacted * 100) : 0}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Taux de validation</span>
                <span style={{ fontWeight: 700, color: '#8B5CF6' }}>{got.consented ? Math.round(got.validated / got.consented * 100) : 0}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Messages envoyés</span>
                <span style={{ fontWeight: 700, color: '#06B6D4' }}>{got.msgsSent || 0}</span>
              </div>
            </div>
          ) : <div style={s('empty')}>En attente de données</div>}
        </div>
      </div>

      <div style={s('section')}>
        <h2 style={s('sectionTitle')}>
          <SvgIcon name="whatsapp" size={18} color="#22C55E"/>
          Derniers messages WhatsApp
          <span style={s('pill', '#E5E7EB', '#374151')}>{messages.length} messages</span>
        </h2>
        {messages.length === 0 ? (
          <div style={s('empty')}>Aucun message pour le moment</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {messages.map((m, i) => (
              <div key={m.id || i} style={s('msgRow', m.direction === 'inbound')}>
                <SvgIcon name={m.direction === 'inbound' ? 'download' : 'send'} size={14} color={m.direction === 'inbound' ? '#22C55E' : '#6B7280'}/>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {m.content?.body || '(aucun contenu)'}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                    <span style={s('pill', m.direction === 'inbound' ? '#DCFCE7' : '#F3F4F6', m.direction === 'inbound' ? '#166534' : '#6B7280')}>
                      {m.direction === 'inbound' ? 'Reçu' : 'Envoyé'}
                    </span>
                  </div>
                </div>
                <span style={s('msgTime')}>{new Date(m.created_at).toLocaleString('fr-FR')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
