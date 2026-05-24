'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SvgIcon } from '../../../lib/icons';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CampaignsPage() {
  const [stats, setStats] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [cronActive, setCronActive] = useState(false);
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
        body: JSON.stringify({ mode: 'contact', batchSize: 20 }),
      });
      const data = await res.json();
      await loadStats();
      return data;
    } catch (err) {
      return { error: err.message };
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

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',color:'#999'}}>Chargement...</div>;

  return (
    <div style={{padding:'24px 32px',maxWidth:1000,margin:'0 auto'}}>
      <h1 style={{fontSize:22,fontWeight:700,marginBottom:4}}>📊 Campagnes WhatsApp</h1>
      <p style={{color:'#6B7280',fontSize:13,marginBottom:24}}>Automatisation et suivi en temps réel</p>

      <div style={{display:'flex',gap:12,marginBottom:24,flexWrap:'wrap'}}>
        <button onClick={handleSendCampaign} disabled={sending}
          style={{padding:'10px 20px',border:'none',borderRadius:10,background:sending?'#9CA3AF':'#22C55E',color:'white',fontWeight:600,cursor:sending?'wait':'pointer',fontSize:13,fontFamily:'inherit',display:'flex',alignItems:'center',gap:8}}>
          {sending ? '⏳ Envoi en cours...' : '📨 Lancer campagne contact'}
        </button>
        <button onClick={toggleAutoCampaign}
          style={{padding:'10px 20px',border:'none',borderRadius:10,background:cronActive?'#ef4444':'#3B82F6',color:'white',fontWeight:600,cursor:'pointer',fontSize:13,fontFamily:'inherit',display:'flex',alignItems:'center',gap:8}}>
          {cronActive ? '⏹ Arrêter auto' : '🔄 Auto (5 min)'}
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:28}}>
        {[
          { label: 'Leads totaux', value: stats?.total || 0, color: '#3B82F6' },
          { label: 'Contactés', value: stats?.contacted || 0, color: '#F59E0B' },
          { label: 'Consentements OUI', value: stats?.consented || 0, color: '#22C55E' },
          { label: 'Boutiques validées', value: stats?.validated || 0, color: '#8B5CF6' },
          { label: 'Messages envoyés', value: stats?.msgsSent || 0, color: '#06B6D4' },
        ].map(k => (
          <div key={k.label} style={{background:'#fff',borderRadius:12,border:'0.5px solid #e5e7eb',padding:16}}>
            <div style={{fontSize:11,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>{k.label}</div>
            <div style={{fontSize:28,fontWeight:700,color:k.color}}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{background:'#fff',borderRadius:12,border:'0.5px solid #e5e7eb',padding:20}}>
        <h2 style={{fontSize:15,fontWeight:600,marginBottom:16}}>📬 Derniers messages WhatsApp</h2>
        {messages.length === 0 ? (
          <p style={{color:'#999',fontSize:13}}>Aucun message pour le moment</p>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {messages.map((m,i) => (
              <div key={m.id || i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:m.direction==='inbound'?'#F0FDF4':'#F3F4F6',borderRadius:8,fontSize:12}}>
                <span style={{fontSize:16}}>{m.direction === 'inbound' ? '📩' : '📤'}</span>
                <span style={{flex:1,color:'#374151',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {m.content?.body || '(vide)'}
                </span>
                <span style={{color:'#9CA3AF',fontSize:10,flexShrink:0}}>
                  {new Date(m.created_at).toLocaleString('fr-FR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{marginTop:16,display:'flex',gap:8}}>
        <button onClick={loadStats} style={{padding:'8px 16px',border:'0.5px solid #e5e7eb',borderRadius:8,background:'#fff',cursor:'pointer',fontSize:12,fontWeight:500,fontFamily:'inherit',color:'#374151'}}>
          🔄 Rafraîchir
        </button>
      </div>
    </div>
  );
}
