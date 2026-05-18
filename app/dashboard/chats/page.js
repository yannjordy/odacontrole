'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadHistory() {
  try {
    const raw = localStorage.getItem('odacontrol_chat_history');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { conversations: [], currentId: null };
}

function saveHistory(data) {
  localStorage.setItem('odacontrol_chat_history', JSON.stringify(data));
}

function FileIcon({ type, size = 20 }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (type === 'csv') return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="10" y1="9" x2="9" y2="9"/><line x1="8" y1="9" x2="8" y2="9"/></svg>;
  if (type === 'pdf') return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6"/><path d="M12 12v6"/><rect x="9" y="12" width="6" height="6" rx="1"/></svg>;
  if (type === 'xlsx') return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="10" y2="15"/><line x1="10" y1="13" x2="8" y2="15"/><line x1="12" y1="13" x2="14" y2="15"/><line x1="14" y1="13" x2="12" y2="15"/><line x1="16" y1="13" x2="18" y2="15"/><line x1="18" y1="13" x2="16" y2="15"/></svg>;
  if (type === 'docx') return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
  if (type === 'image') return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
  return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
}

function getFileType(name, mime) {
  if (mime?.startsWith('image/')) return 'image';
  if (name.endsWith('.csv')) return 'csv';
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'xlsx';
  if (name.endsWith('.docx')) return 'docx';
  return 'file';
}

function getFileBg(type) {
  const map = { image: '#DCFCE7', csv: '#DBEAFE', pdf: '#FEE2E2', xlsx: '#ECFDF5', docx: '#FEF3C7', file: '#F3E8FF' };
  return map[type] || '#F3E8FF';
}

function getFileColor(type) {
  const map = { image: '#16A34A', csv: '#2563EB', pdf: '#DC2626', xlsx: '#059669', docx: '#D97706', file: '#7C3AED' };
  return map[type] || '#7C3AED';
}

function truncate(str, len = 40) {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [aiConnected, setAiConnected] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const endRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const h = loadHistory();
    setConversations(h.conversations);
    setCurrentConvId(h.currentId);
    if (h.currentId) {
      const conv = h.conversations.find(c => c.id === h.currentId);
      if (conv) {
        setMessages(conv.messages);
        setLoading(false);
        return;
      }
    }
    const welcome = { role: 'assistant', content: '👋 Bonjour ! Je suis **DeerFlow**, l\'orchestrateur principal d\'ODAControl.\n\nJe peux vous aider à :\n- 📊 Analyser les performances de la plateforme\n- 🤖 Configurer et lancer des agents\n- 🎯 Créer des campagnes d\'acquisition\n- 📈 Optimiser votre pipeline de vendeurs\n- ❓ Répondre à vos questions sur le système\n\nQue puis-je faire pour vous ?', time: new Date().toISOString() };
    setMessages([welcome]);
    setLoading(false);
    newConversation([welcome]);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    fetch('/api/health', { signal: AbortSignal.timeout(5000) })
      .then(r => setAiConnected(r.ok))
      .catch(() => setAiConnected(false));
  }, []);

  async function writeLog(action, severity, details) {
    try { await supabase.from('audit_logs').insert({ action, severity, details }); } catch {}
  }

  function persistMessages(convId, msgs) {
    setConversations(prev => {
      const updated = prev.map(c => c.id === convId ? { ...c, messages: msgs, updated_at: new Date().toISOString() } : c);
      saveHistory({ conversations: updated, currentId: convId });
      return updated;
    });
  }

  function newConversation(msgs) {
    const id = generateId();
    const title = msgs[1]?.content ? truncate(msgs[1].content) : 'Nouvelle conversation';
    const conv = { id, title, messages: msgs, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setConversations(prev => {
      const updated = [conv, ...prev].slice(0, 50);
      saveHistory({ conversations: updated, currentId: id });
      return updated;
    });
    setCurrentConvId(id);
    return id;
  }

  function switchConversation(id) {
    const h = loadHistory();
    const conv = h.conversations.find(c => c.id === id);
    if (conv) {
      setMessages(conv.messages);
      setCurrentConvId(id);
      saveHistory({ ...h, currentId: id });
      setShowHistory(false);
    }
  }

  function deleteConversation(id, e) {
    e.stopPropagation();
    const h = loadHistory();
    const filtered = h.conversations.filter(c => c.id !== id);
    const data = { conversations: filtered, currentId: h.currentId === id ? null : h.currentId };
    saveHistory(data);
    setConversations(filtered);
    if (h.currentId === id) {
      setMessages([]);
      setCurrentConvId(null);
    }
  }

  async function askAI(prompt) {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data.reply;
    } catch {
      return null;
    }
  }

  async function send() {
    if ((!input.trim() && !uploadedFile) || sending) return;
    let content = input;
    if (uploadedFile) {
      content = `[Fichier joint: ${uploadedFile.name}]\n${content || '(fichier importé)'}`;
    }
    const userMsg = { role: 'user', content, time: new Date().toISOString() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setSending(true);
    setUploadedFile(null);
    setUploadResult(null);

    let convId = currentConvId;
    if (!convId) {
      convId = newConversation(updated);
    } else {
      persistMessages(convId, updated);
      // auto-update title from first user message if still default
      setConversations(prev => prev.map(c => {
        if (c.id === convId && (c.title === 'Nouvelle conversation' || c.title === 'Nouveau') && c.messages.length <= 2) {
          const newTitle = truncate(content, 50);
          const upd = { ...c, title: newTitle, messages: updated, updated_at: new Date().toISOString() };
          saveHistory({ conversations: prev.map(x => x.id === convId ? upd : x), currentId: convId });
          return upd;
        }
        return c;
      }));
    }

    let response = await askAI(content);
    if (!response) {
      setAiConnected(false);
      writeLog('chat_ia_down', 'error', { user_message: content.slice(0, 100) });
      response = '⚠️ Je n\'arrive pas à contacter mon IA. Vérifie la clé **OPENROUTER_API_KEY** dans `.env.local`.\n\nEn attendant : **DeerFlow** 🧠, orchestrateur ODAControl.\n\nAgents : 🔍 Sarah → 💬 Marc → 📋 Fatou → 🔑 Koffi → 📦 Awa → 📱 Yann\n✅ Paul · 📊 Eve';
    } else {
      setAiConnected(true);
      writeLog('chat_reply', 'info', { user_message: content.slice(0, 50), reply_length: response.length });
    }
    const final = [...updated, { role: 'assistant', content: response, time: new Date().toISOString() }];
    setMessages(final);
    persistMessages(convId, final);
    setSending(false);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/import-contacts', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setUploadResult({ type: 'success', text: `${data.total} contacts importés` });
      } else {
        setUploadResult({ type: 'error', text: data.error || 'Erreur' });
      }
    } catch {
      setUploadResult({ type: 'error', text: 'Erreur réseau' });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 110px)', gap: 0 }}>
      {/* History Sidebar */}
      <div style={{
        width: showHistory ? 260 : 0, overflow: 'hidden', transition: 'width .25s ease', flexShrink: 0,
        background: '#f8f9fa', borderRadius: '16px 0 0 16px', border: '1px solid #f0f0f0', borderRight: 'none',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>📋 Historique</span>
          <button onClick={() => {
            const id = generateId();
            const welcome = { role: 'assistant', content: '👋 Bonjour ! Je suis **DeerFlow**…', time: new Date().toISOString() };
            setConversations(prev => {
              const conv = { id, title: 'Nouveau', messages: [welcome], created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
              const updated = [conv, ...prev];
              saveHistory({ conversations: updated, currentId: id });
              return updated;
            });
            setCurrentConvId(id);
            setMessages([welcome]);
            setShowHistory(false);
          }} style={{ border: 'none', background: '#3B82F6', color: 'white', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Nouveau</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: '#bbb' }}>Aucune conversation</div>
          ) : conversations.map(conv => (
            <div key={conv.id} onClick={() => switchConversation(conv.id)}
              style={{
                padding: '8px 14px', cursor: 'pointer', borderLeft: currentConvId === conv.id ? '3px solid #3B82F6' : '3px solid transparent',
                background: currentConvId === conv.id ? '#e8f0fe' : 'transparent', transition: 'background .15s',
              }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: currentConvId === conv.id ? '#1a1a1a' : '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {conv.title}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                <span style={{ fontSize: 9, color: '#999' }}>{conv.updated_at ? new Date(conv.updated_at).toLocaleDateString('fr-FR') : ''}</span>
                <button onClick={(e) => deleteConversation(conv.id, e)} style={{ border: 'none', background: 'none', color: '#ccc', cursor: 'pointer', fontSize: 10, padding: 0, lineHeight: 1 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: showHistory ? '0 16px 16px 0' : 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)', border: '1px solid #f0f0f0' }}>
        {/* Header */}
        <div className="adpagehead" style={{ marginBottom: 0, flexShrink: 0, padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setShowHistory(!showHistory)}
              style={{ border: 'none', background: showHistory ? '#3B82F610' : '#f0f0f0', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>
              ☰
            </button>
            <div>
              <h2 style={{ fontSize: 14, margin: 0 }}>🤖 Chat IA — DeerFlow</h2>
              <p style={{ fontSize: 10, color: '#999', margin: '1px 0 0' }}>{currentConvId ? truncate(conversations.find(c => c.id === currentConvId)?.title || '', 50) : 'Nouvelle conversation'}</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }} ref={endRef}>
          {loading ? <div className="adld"><div className="adsp" /></div> : messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 14, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: msg.role === 'user' ? 'linear-gradient(135deg,#1a1a2e,#5856D6)' : 'linear-gradient(135deg,#007AFF,#5856D6)',
                color: 'white', fontSize: '.8rem', fontWeight: 700,
              }}>
                {msg.role === 'user' ? '👤' : '🧠'}
              </div>
              <div style={{
                maxWidth: '75%', padding: '10px 14px', borderRadius: 12,
                background: msg.role === 'user' ? '#1a1a2e' : '#f0f2f5',
                color: msg.role === 'user' ? 'white' : '#1a1a1a',
                borderBottomRightRadius: msg.role === 'user' ? 4 : 12,
                borderBottomLeftRadius: msg.role === 'user' ? 12 : 4,
              }}>
                <div style={{ fontSize: '.8rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}
                  dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                <div style={{ fontSize: '.6rem', color: msg.role === 'user' ? 'rgba(255,255,255,.4)' : '#8e8e93', marginTop: 4 }}>
                  {new Date(msg.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {sending && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#007AFF,#5856D6)', color: 'white' }}>🧠</div>
              <div style={{ background: '#f0f2f5', borderRadius: 12, borderBottomLeftRadius: 4, padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: 3 }}>
                  <span style={{ width: 7, height: 7, background: '#8e8e93', borderRadius: '50%', animation: 'adspin .8s linear infinite' }} />
                  <span style={{ width: 7, height: 7, background: '#8e8e93', borderRadius: '50%', animation: 'adspin .8s linear infinite .2s' }} />
                  <span style={{ width: 7, height: 7, background: '#8e8e93', borderRadius: '50%', animation: 'adspin .8s linear infinite .4s' }} />
                </div>
              </div>
            </div>
          )}
          <div />
        </div>

        {/* Upload card — Telegram style */}
        {uploadedFile && (
          <div style={{
            margin: '0 14px 6px', padding: '10px 14px',
            background: 'white', borderRadius: 14,
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 12px rgba(0,0,0,.06)',
            display: 'flex', alignItems: 'center', gap: 12,
            animation: 'slideUp .2s ease',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: getFileBg(getFileType(uploadedFile.name, uploadedFile.type)),
              color: getFileColor(getFileType(uploadedFile.name, uploadedFile.type)),
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <FileIcon type={getFileType(uploadedFile.name, uploadedFile.type)} size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: '#1a1a1a', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {uploadedFile.name}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                <span style={{ fontSize: 10, color: '#8e8e93' }}>{(uploadedFile.size / 1024).toFixed(1)} KB</span>
                {uploading && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#8B5CF6' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B5CF6', animation: 'pulse 1s infinite' }}/>
                    Importation...
                  </span>
                )}
                {uploadResult && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3,
                    color: uploadResult.type === 'success' ? '#16A34A' : '#EF4444',
                  }}>
                    {uploadResult.type === 'success' ? '✅' : '❌'} {uploadResult.text}
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => { setUploadedFile(null); setUploadResult(null); }}
              style={{
                width: 26, height: 26, border: 'none', borderRadius: 8, background: '#f0f0f0',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#999', fontSize: 12, flexShrink: 0, transition: 'all .15s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#e0e0e0'; e.currentTarget.style.color = '#666'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#f0f0f0'; e.currentTarget.style.color = '#999'; }}>
              ✕
            </button>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, background: 'white', alignItems: 'center' }}>
          <button onClick={() => fileRef.current?.click()} title="Joindre un fichier (CSV, XLSX, DOCX, PDF)"
            style={{
              border: '1.5px dashed #d0d0d0', background: 'white', borderRadius: 10, width: 36, height: 36,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, flexShrink: 0, transition: 'all .2s',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#8B5CF6'; e.currentTarget.style.background = '#F5F3FF'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = '#d0d0d0'; e.currentTarget.style.background = 'white'; }}>
            📎
          </button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.docx,.pdf,.txt,.json" onChange={handleFileUpload} style={{ display: 'none' }} />
          <input style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e0e0e0', fontSize: '.82rem', outline: 'none', fontFamily: 'inherit' }}
            placeholder="Parlez à DeerFlow..." value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <button className="adbtn adbtn-primary" onClick={send} disabled={sending || (!input.trim() && !uploadedFile)}
            style={{ padding: '9px 16px', borderRadius: 10, fontSize: '.82rem', flexShrink: 0 }}>
            {sending ? '...' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  );
}
