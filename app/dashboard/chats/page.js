'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRole } from '../RoleContext';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CHAT_CSS = `
.chat-wrap{display:flex;height:calc(100vh - 110px);gap:0}
.chat-sidebar{width:260px;flex-shrink:0;background:#f8f9fa;border-radius:16px 0 0 16px;border:1px solid #f0f0f0;border-right:none;display:flex;flex-direction:column;overflow:hidden}
.chat-sidebar.collapsed{width:0;overflow:hidden;border:none}
.chat-main{flex:1;display:flex;flex-direction:column;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06);border:1px solid #f0f0f0;transition:border-radius .25s}
.chat-main.sidebar-open{border-radius:0 16px 16px 0}
.chat-header{flex-shrink:0;padding:12px 16px;border-bottom:0.5px solid #f0f0f0;display:flex;align-items:center;gap:10px}
.chat-header h2{font-size:14px;margin:0;display:flex;align-items:center;gap:6px}
.chat-header p{font-size:10px;color:#999;margin:1px 0 0}
.chat-messages{flex:1;overflow-y:auto;padding:16px}
.chat-msg{display:flex;gap:10px;margin-bottom:14px}
.chat-msg.user{flex-direction:row-reverse}
.chat-avatar{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px;font-weight:700;color:#fff}
.chat-avatar.assistant{background:linear-gradient(135deg,#007AFF,#5856D6)}
.chat-avatar.user{background:linear-gradient(135deg,#1a1a2e,#5856D6)}
.chat-bubble{max-width:75%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.55;white-space:pre-wrap}
.chat-bubble.user{background:#1a1a2e;color:#fff;border-bottom-right-radius:4px}
.chat-bubble.assistant{background:#f0f2f5;color:#1a1a1a;border-bottom-left-radius:4px}
.chat-bubble strong{font-weight:600}
.chat-time{font-size:10px;color:var(--time-color,#8e8e93);margin-top:4px}
.chat-bubble.user .chat-time{--time-color:rgba(255,255,255,.4)}

.chat-typing{display:flex;gap:10px;margin-bottom:14px}
.chat-typing-dots{display:flex;gap:3px;padding:12px 16px;background:#f0f2f5;border-radius:12px;border-bottom-left-radius:4px}
.chat-typing-dots span{width:7px;height:7px;background:#8e8e93;border-radius:50%;animation:chatBounce .8s ease-in-out infinite}
.chat-typing-dots span:nth-child(2){animation-delay:.15s}
.chat-typing-dots span:nth-child(3){animation-delay:.3s}
@keyframes chatBounce{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}

.chat-upload-card{margin:0 14px 6px;padding:10px 14px;background:#fff;border-radius:14px;border:1px solid #e5e7eb;box-shadow:0 2px 12px rgba(0,0,0,.06);display:flex;align-items:center;gap:12px;animation:slideUp .2s ease}
.chat-upload-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.chat-upload-info{flex:1;min-width:0}
.chat-upload-name{font-weight:600;color:#1a1a1a;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.chat-upload-meta{display:flex;gap:8px;align-items:center;margin-top:2px;font-size:10px}
.chat-upload-close{width:26px;height:26px;border:none;border-radius:8px;background:#f0f0f0;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#999;font-size:12px;flex-shrink:0;transition:all .15s}
.chat-upload-close:hover{background:#e0e0e0;color:#666}
.chat-input-wrap{padding:10px 14px;border-top:0.5px solid #f0f0f0;display:flex;gap:8px;background:#fff;align-items:center}
.chat-input{flex:1;padding:9px 12px;border-radius:10px;border:1.5px solid #e0e0e0;font-size:13px;outline:none;font-family:inherit;transition:border-color .15s}
.chat-input:focus{border-color:#007AFF}
.chat-attach-btn{border:1.5px dashed #d0d0d0;background:#fff;border-radius:10px;width:36px;height:36px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;transition:all .2s}
.chat-attach-btn:hover{border-color:#8B5CF6;background:#F5F3FF}

.chat-sidebar-header{padding:12px 14px;border-bottom:0.5px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center}
.chat-sidebar-header span{font-size:12px;font-weight:700;color:#555}
.chat-conv-list{flex:1;overflow-y:auto;padding:6px 0}
.chat-conv-item{padding:8px 14px;cursor:pointer;border-left:3px solid transparent;transition:background .15s}
.chat-conv-item.active{background:#e8f0fe;border-left-color:#3B82F6}
.chat-conv-item:not(.active):hover{background:#f0f2f5}
.chat-conv-title{font-size:11px;font-weight:600;color:#555;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.chat-conv-item.active .chat-conv-title{color:#1a1a1a}
.chat-conv-meta{display:flex;justify-content:space-between;align-items:center;margin-top:2px}
.chat-conv-date{font-size:9px;color:#999}
.chat-conv-del{background:none;border:none;color:#ccc;cursor:pointer;font-size:10px;padding:0;line-height:1}
.chat-conv-del:hover{color:#ef4444}
`;

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
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const m = (t) => t === type ? { ...p } : p;
  return (
    <svg {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      {type === 'pdf' && <><path d="M9 15h6"/><path d="M12 12v6"/><rect x="9" y="12" width="6" height="6" rx="1"/></>}
      {type === 'csv' && <><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></>}
      {type === 'txt' && <><line x1="10" y1="13" x2="16" y2="13"/><line x1="10" y1="17" x2="14" y2="17"/></>}
    </svg>
  );
}

function getFileType(name) {
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.csv')) return 'csv';
  if (name.endsWith('.txt')) return 'txt';
  return 'file';
}

function getFileStyle(type) {
  const m = { pdf: { bg: '#FEE2E2', fg: '#DC2626' }, csv: { bg: '#DBEAFE', fg: '#2563EB' }, txt: { bg: '#F3E8FF', fg: '#7C3AED' }, file: { bg: '#F3F4F6', fg: '#6B7280' } };
  return m[type] || m.file;
}

function truncate(str, len = 40) {
  return str?.length > len ? str.slice(0, len) + '…' : str || '';
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return "Aujourd'hui";
  if (diff < 172800000) return 'Hier';
  return d.toLocaleDateString('fr-FR');
}

export default function ChatPage() {
  const { isAdmin } = useRole();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [aiConnected, setAiConnected] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const endRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'chat-css';
    style.textContent = CHAT_CSS;
    if (!document.getElementById('chat-css')) document.head.appendChild(style);
  }, []);

  useEffect(() => {
    const h = loadHistory();
    setConversations(h.conversations);
    setCurrentConvId(h.currentId);
    if (h.currentId) {
      const conv = h.conversations.find(c => c.id === h.currentId);
      if (conv) {
        setMessages(conv.messages);
        setSessionId(conv.sessionId || null);
        setLoading(false);
        return;
      }
    }
    const welcome = {
      role: 'assistant',
      content: `👋 Bonjour ! Je suis **DeerFlow**, votre orchestrateur IA.

Je peux :
• 📄 **Analyser** vos documents PDF et fichiers texte
• 🤖 **Coordonner** les agents ODAControl
• 📊 **Générer** des rapports et analyses
• 💡 ** vous conseiller** sur vos campagnes

Que puis-je faire pour vous aujourd'hui ?`,
      time: new Date().toISOString()
    };
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

  function persistMessages(convId, msgs, sid) {
    setConversations(prev => {
      const updated = prev.map(c =>
        c.id === convId ? { ...c, messages: msgs, sessionId: sid || c.sessionId, updated_at: new Date().toISOString() } : c
      );
      saveHistory({ conversations: updated, currentId: convId });
      return updated;
    });
  }

  function newConversation(msgs) {
    const id = generateId();
    const conv = { id, title: 'Nouveau', messages: msgs, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
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
      setSessionId(conv.sessionId || null);
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
    if (h.currentId === id) { setMessages([]); setCurrentConvId(null); setSessionId(null); }
  }

  async function readFileContent(file) {
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      return await file.text();
    }
    if (file.name.endsWith('.pdf') || file.name.endsWith('.csv')) {
      return await file.text();
    }
    return null;
  }

  async function askAI(prompt, convMsgs) {
    try {
      const payload = { message: prompt };
      if (sessionId) payload.sessionId = sessionId;
      if (convMsgs?.length) payload.history = convMsgs.slice(-20);
      if (fileContent && uploadedFile) {
        payload.fileContent = fileContent;
        payload.fileName = uploadedFile.name;
      }
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.sessionId) setSessionId(data.sessionId);
      return data.reply;
    } catch {
      return null;
    }
  }

  async function send() {
    if ((!input.trim() && !fileContent) || sending) return;
    const content = input || (fileContent ? '[Analyse du fichier]' : '');
    const userMsg = { role: 'user', content, time: new Date().toISOString() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setSending(true);

    let convId = currentConvId;
    if (!convId) {
      convId = newConversation(updated);
    } else {
      persistMessages(convId, updated, sessionId);
      setConversations(prev => prev.map(c => {
        if (c.id === convId && (c.title === 'Nouveau' || c.title === 'Nouvelle conversation') && c.messages.length <= 2) {
          const newTitle = truncate(content, 50);
          return { ...c, title: newTitle, messages: updated, updated_at: new Date().toISOString() };
        }
        return c;
      }));
    }

    let response = await askAI(content, messages);
    if (!response) {
      setAiConnected(false);
      writeLog('chat_ia_down', 'error', { user_message: content?.slice(0, 100) });
      response = `⚠️ Impossible de contacter l'IA. Vérifie **OPENROUTER_API_KEY** dans \`.env.local\`.

En attendant, je reste DeerFlow 🧠 — orchestrateur ODAControl.

**Agents disponibles :**
🔍 Sarah (Recherche) · 💬 Farida (Contact)
📋 Fatou (Onboarding) · 🔑 Koffi (Comptes)
📦 Awa (Publication) · 📱 Oceane (Suivi)
📊 Eve (Marketing) · ✅ Paul (Supervision)`;
    } else {
      setAiConnected(true);
      writeLog('chat_reply', 'info', { user_message: content?.slice(0, 50) });
    }

    const final = [...updated, { role: 'assistant', content: response, time: new Date().toISOString() }];
    setMessages(final);
    persistMessages(convId, final, sessionId);
    setSending(false);
    setUploadedFile(null);
    setFileContent(null);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    try {
      const text = await readFileContent(file);
      if (text) {
        setFileContent(text.slice(0, 15000));
        // Auto-send the file content for analysis
        const content = `[📄 Fichier joint: ${file.name}]`;
        const userMsg = { role: 'user', content, time: new Date().toISOString() };
        const updated = [...messages, userMsg];
        setMessages(updated);
        setSending(true);

        let convId = currentConvId;
        if (!convId) {
          convId = newConversation(updated);
        } else {
          persistMessages(convId, updated, sessionId);
        }

        let response = await askAI(content, messages);
        if (!response) {
          response = `⚠️ Je n'ai pas pu analyser ce fichier pour le moment.`;
        }

        const final = [...updated, { role: 'assistant', content: response, time: new Date().toISOString() }];
        setMessages(final);
        persistMessages(convId, final, sessionId);
        setSending(false);
        setUploadedFile(null);
        setFileContent(null);
      } else {
        alert('Format non supporté. Utilisez PDF, TXT ou CSV.');
      }
    } catch {
      alert('Erreur de lecture du fichier');
    }
    setUploadedFile(null);
    setFileContent(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  if (loading) return <div className="adld"><div className="adsp"/></div>;

  return (
    <div className="chat-wrap">
      {/* Sidebar */}
      <div className={`chat-sidebar${showHistory ? '' : ' collapsed'}`}>
        <div className="chat-sidebar-header">
          <span>📋 Historique</span>
          {isAdmin && (
            <button onClick={() => {
              const id = generateId();
              const welcome = { role: 'assistant', content: '👋 Bonjour ! Je suis **DeerFlow**…', time: new Date().toISOString() };
              setConversations(prev => {
                const conv = { id, title: 'Nouveau', messages: [welcome], created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
                const updated = [conv, ...prev];
                saveHistory({ conversations: updated, currentId: id });
                return updated;
              });
              setCurrentConvId(id); setMessages([welcome]); setSessionId(null); setShowHistory(false);
            }} style={{ border: 'none', background: '#3B82F6', color: 'white', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Nouveau
            </button>
          )}
        </div>
        <div className="chat-conv-list">
          {conversations.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: '#bbb' }}>Aucune conversation</div>
          ) : conversations.map(conv => (
            <div key={conv.id} onClick={() => switchConversation(conv.id)}
              className={`chat-conv-item${currentConvId === conv.id ? ' active' : ''}`}>
              <div className="chat-conv-title">{conv.title}</div>
              <div className="chat-conv-meta">
                <span className="chat-conv-date">{formatDate(conv.updated_at)}</span>
                {isAdmin && <button onClick={e => deleteConversation(conv.id, e)} className="chat-conv-del">✕</button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className={`chat-main${showHistory ? ' sidebar-open' : ''}`}>
        <div className="chat-header">
          <button onClick={() => setShowHistory(!showHistory)}
            style={{ border: 'none', background: showHistory ? '#3B82F610' : '#f0f0f0', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>
            ☰
          </button>
          <div>
            <h2>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg,#007AFF,#5856D6)', color: '#fff', fontSize: 12, fontWeight: 700 }}>DF</span>
              DeerFlow IA
              {aiConnected
                ? <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#34C759', marginLeft: 6 }} title="Connecté"/>
                : <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#FF3B30', marginLeft: 6 }} title="Déconnecté"/>}
            </h2>
            <p>{currentConvId ? (conversations.find(c => c.id === currentConvId)?.title || 'Conversation') : 'Nouvelle conversation'} · {sessionId ? 'Mémoire active' : 'Session temporaire'}</p>
          </div>
        </div>

        <div className="chat-messages" ref={endRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`chat-msg ${msg.role}`}>
              <div className={`chat-avatar ${msg.role}`}>
                {msg.role === 'user' ? '👤' : '🧠'}
              </div>
              <div className={`chat-bubble ${msg.role}`}>
                <div dangerouslySetInnerHTML={{
                  __html: msg.content
                    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:#1a1a2e;color:#e0e0e0;padding:8px 10px;border-radius:8px;font-size:11px;overflow-x:auto;margin:6px 0"><code>$2</code></pre>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br/>')
                }} />
                <div className="chat-time">{formatTime(msg.time)}</div>
              </div>
            </div>
          ))}
          {sending && (
            <div className="chat-typing">
              <div className="chat-avatar assistant">🧠</div>
              <div className="chat-typing-dots">
                <span/><span/><span/>
              </div>
            </div>
          )}
          <div/>
        </div>

        {uploadedFile && !sending && (
          <div className="chat-upload-card">
            <div className="chat-upload-icon" style={{ background: getFileStyle(getFileType(uploadedFile.name)).bg, color: getFileStyle(getFileType(uploadedFile.name)).fg }}>
              <FileIcon type={getFileType(uploadedFile.name)} size={20}/>
            </div>
            <div className="chat-upload-info">
              <div className="chat-upload-name">{uploadedFile.name}</div>
              <div className="chat-upload-meta">
                <span style={{ color: '#8e8e93' }}>{(uploadedFile.size / 1024).toFixed(1)} KB</span>
                <span style={{ color: '#8B5CF6', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B5CF6', animation: 'pulse 1s infinite' }}/>
                  Analyse en cours...
                </span>
              </div>
            </div>
            <button onClick={() => { setUploadedFile(null); setFileContent(null); }} className="chat-upload-close">✕</button>
          </div>
        )}

        <div className="chat-input-wrap">
          {isAdmin && (
            <>
              <button onClick={() => fileRef.current?.click()} className="chat-attach-btn" title="Joindre PDF, TXT ou CSV">📎</button>
              <input ref={fileRef} type="file" accept=".pdf,.txt,.csv" onChange={handleFileUpload} style={{ display: 'none' }}/>
            </>
          )}
          <input className="chat-input"
            placeholder="Parlez à DeerFlow..." value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}/>
          {isAdmin && (
            <button onClick={send} disabled={sending || (!input.trim() && !fileContent)}
              className="adbtn adbtn-primary" style={{ padding: '9px 16px', borderRadius: 10, fontSize: '13px', flexShrink: 0 }}>
              {sending ? '...' : 'Envoyer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
