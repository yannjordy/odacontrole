'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRole } from '../RoleContext';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const SETTINGS_SECTIONS = {
  general: {
    label: 'Général',
    icon: '⚙️',
    fields: [
      { key: 'app_name', label: "Nom de l'application", type: 'text', default: 'ODA Contrôle' },
      { key: 'platform_url', label: 'URL de la plateforme', type: 'text', default: typeof window !== 'undefined' ? window.location.origin : '' },
      { key: 'notification_email', label: 'Email de notification', type: 'email', default: '' },
    ]
  },
  whatsapp: {
    label: 'WhatsApp Business',
    icon: '💬',
    fields: [
      { key: 'whatsapp_business_phone', label: 'Numéro WhatsApp', type: 'text', default: '', placeholder: '+2376XXXXXXXX' },
      { key: 'whatsapp_api_key', label: 'Clé API WhatsApp', type: 'password', default: '', placeholder: '••••••••' },
      { key: 'whatsapp_template_name', label: 'Nom du template message', type: 'text', default: 'oda_welcome', placeholder: 'oda_welcome' },
    ]
  },
  agents: {
    label: 'Agents IA',
    icon: '🤖',
    fields: [
      { key: 'max_concurrent_agents', label: 'Agents concurrents max', type: 'number', default: '5' },
      { key: 'auto_lead_scoring', label: 'Scoring automatique des leads', type: 'checkbox', default: true },
      { key: 'auto_whatsapp_followup', label: 'Relance WhatsApp automatique', type: 'checkbox', default: false },
      { key: 'agent_timeout_minutes', label: "Timeout d'exécution (minutes)", type: 'number', default: '10' },
    ]
  },
  distribution: {
    label: 'Distribution',
    icon: '📲',
    fields: [
      { key: 'oda_market_url', label: 'URL ODA Market', type: 'text', default: 'https://oda-market.vercel.app' },
      { key: 'oda_seller_url', label: 'URL ODA Seller', type: 'text', default: 'https://oda-seller.vercel.app' },
    ]
  }
};

const AGENTS_CONFIG = [
  { key: 'orchestrator', name: 'DeerFlow', role: 'Orchestrateur IA', emoji: '🧠', color: '#3B82F6',
    fields: [
      { type: 'tools', label: 'Orchestrateur de flux', key: 'orchestrator_tools' },
    ]},
  { key: 'supervisor', name: 'Paul', role: 'Superviseur Qualité', emoji: '✅', color: '#E91E90',
    fields: [
      { type: 'tools', label: 'Règles de validation', key: 'supervisor_tools' },
    ]},
  { key: 'research', name: 'Sarah', role: 'Agent de Recherche', emoji: '🔍', color: '#B45309',
    fields: [
      { type: 'api', label: 'API Facebook/Instagram', key: 'research_api', placeholder: 'Entrez la clé API...' },
      { type: 'tools', label: 'Scraper web, Parsing HTML', key: 'research_tools' },
    ]},
  { key: 'contact', name: 'Marc', role: 'Agent Contact', emoji: '💬', color: '#16A34A',
    fields: [
      { type: 'api', label: 'WhatsApp Business API', key: 'contact_api', placeholder: 'Entrez la clé API WhatsApp...' },
      { type: 'tools', label: 'Template messages WhatsApp', key: 'contact_tools' },
    ]},
  { key: 'onboarding', name: 'Fatou', role: 'Agent Onboarding', emoji: '📋', color: '#EA580C',
    fields: [
      { type: 'tools', label: 'Questionnaire structuré', key: 'onboarding_tools' },
    ]},
  { key: 'account_creation', name: 'Koffi', role: 'Créateur de Comptes', emoji: '🔑', color: '#7C3AED',
    fields: [
      { type: 'api', label: 'API Supabase (clés requises)', key: 'account_creation_api', placeholder: 'Entrez la clé API Supabase...' },
      { type: 'tools', label: 'Générateur mot de passe', key: 'account_creation_tools' },
    ]},
  { key: 'product_publishing', name: 'Awa', role: 'Agent Publication', emoji: '📦', color: '#A855F7',
    fields: [
      { type: 'tools', label: 'Analyseur images, Générateur descriptions', key: 'product_publishing_tools' },
    ]},
  { key: 'whatsapp_followup', name: 'Yann', role: 'Agent Suivi WhatsApp', emoji: '📱', color: '#059669',
    fields: [
      { type: 'api', label: 'WhatsApp Business API', key: 'whatsapp_followup_api', placeholder: 'Entrez la clé API WhatsApp...' },
      { type: 'tools', label: 'Template validation boutique', key: 'whatsapp_followup_tools' },
    ]},
  { key: 'marketing', name: 'Eve', role: 'Agent Marketing', emoji: '📊', color: '#CA8A04',
    fields: [
      { type: 'tools', label: 'Analyseur statistiques, Générateur A/B test', key: 'marketing_tools' },
    ]},
];

const QUICK_ACTIONS = [
  { label: 'Dashboard Supabase', icon: '🗄️', url: 'https://app.supabase.com/project/xjckbqbqxcwzcrlmuvzf', desc: 'Accéder à la console Supabase' },
  { label: 'Gérer les utilisateurs', icon: '👥', url: '/dashboard/utilisateurs', desc: 'Liste des utilisateurs, blocs, rôles' },
  { label: 'Voir les logs', icon: '📋', url: '/dashboard/logs', desc: 'Journal des actions système' },
  { label: 'Agent Hub', icon: '🤖', url: '/dashboard/agent-hub', desc: 'Voir et configurer les agents' },
  { label: 'Pipeline leads', icon: '🎯', url: '/dashboard/leads', desc: 'Suivi des prospects vendeurs' },
  { label: 'Distribution', icon: '📲', url: '/dashboard/distribution', desc: 'QR codes et campagnes' },
];

const SQL_SECTIONS = {
  core: { name: 'Tables principales', sql: `CREATE TABLE IF NOT EXISTS agents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'idle', config JSONB DEFAULT '{}'::jsonb, created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), total_runs INTEGER DEFAULT 0, success_count INTEGER DEFAULT 0, error_count INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS agent_runs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), agent_id UUID REFERENCES agents(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'running', started_at TIMESTAMPTZ DEFAULT now(), completed_at TIMESTAMPTZ, duration_ms INTEGER, input_data JSONB DEFAULT '{}'::jsonb, output_data JSONB DEFAULT '{}'::jsonb, error TEXT);
CREATE TABLE IF NOT EXISTS workflows (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', steps JSONB DEFAULT '[]'::jsonb, created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS workflow_steps (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE, agent_id UUID REFERENCES agents(id), step_order INTEGER NOT NULL, name TEXT, config JSONB DEFAULT '{}'::jsonb, depends_on UUID[] DEFAULT ARRAY[]::UUID[], status TEXT DEFAULT 'pending');` },
  leads: { name: 'Pipeline leads', sql: `CREATE TABLE IF NOT EXISTS leads (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), full_name TEXT, phone TEXT NOT NULL, email TEXT, city TEXT, business_name TEXT, business_type TEXT, source TEXT DEFAULT 'whatsapp', status TEXT NOT NULL DEFAULT 'new', consent_given BOOLEAN DEFAULT false, consent_date TIMESTAMPTZ, notes TEXT, assigned_agent_id UUID REFERENCES agents(id), created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), last_contact_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS contact_attempts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id UUID REFERENCES leads(id) ON DELETE CASCADE, channel TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', message_content TEXT, agent_id UUID REFERENCES agents(id), sent_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS consent_records (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id UUID REFERENCES leads(id) ON DELETE CASCADE, consent_type TEXT NOT NULL, granted BOOLEAN NOT NULL DEFAULT true, ip_address TEXT, user_agent TEXT, recorded_at TIMESTAMPTZ DEFAULT now(), expires_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS onboarding_sessions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id UUID REFERENCES leads(id) ON DELETE CASCADE, user_id UUID REFERENCES auth.users(id), step INTEGER DEFAULT 0, max_steps INTEGER DEFAULT 6, status TEXT NOT NULL DEFAULT 'in_progress', data JSONB DEFAULT '{}'::jsonb, started_at TIMESTAMPTZ DEFAULT now(), completed_at TIMESTAMPTZ);` },
  shops: { name: 'Boutiques', sql: `CREATE TABLE IF NOT EXISTS shops (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id UUID REFERENCES leads(id), seller_id UUID REFERENCES auth.users(id), name TEXT NOT NULL, slug TEXT UNIQUE, status TEXT NOT NULL DEFAULT 'pending', validation_status TEXT DEFAULT 'pending', validated_by UUID REFERENCES auth.users(id), products_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());` },
  whatsapp: { name: 'WhatsApp', sql: `CREATE TABLE IF NOT EXISTS whatsapp_messages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id UUID REFERENCES leads(id) ON DELETE CASCADE, direction TEXT NOT NULL, message_type TEXT DEFAULT 'text', content JSONB NOT NULL DEFAULT '{}'::jsonb, status TEXT NOT NULL DEFAULT 'pending', sent_at TIMESTAMPTZ DEFAULT now(), delivered_at TIMESTAMPTZ, read_at TIMESTAMPTZ, cost DECIMAL(10,4) DEFAULT 0);` },
  distribution: { name: 'Distribution', sql: `CREATE TABLE IF NOT EXISTS distribution_campaigns (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, app_type TEXT NOT NULL, target_url TEXT NOT NULL, status TEXT DEFAULT 'draft', channels JSONB DEFAULT '[]'::jsonb, total_clicks INTEGER DEFAULT 0, total_installs INTEGER DEFAULT 0, created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());` },
  audit: { name: 'Audit & Métriques', sql: `CREATE TABLE IF NOT EXISTS audit_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), agent_id UUID REFERENCES agents(id), workflow_id UUID REFERENCES workflows(id), action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, details JSONB DEFAULT '{}'::jsonb, severity TEXT DEFAULT 'info', created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS metrics (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), metric_name TEXT NOT NULL, metric_value DECIMAL(15,2) NOT NULL, tags JSONB DEFAULT '{}'::jsonb, agent_id UUID REFERENCES agents(id), recorded_at TIMESTAMPTZ DEFAULT now());` },
  indexes: { name: 'Indexes & Triggers', sql: `CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_shops_status ON shops(status);
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents; CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads; CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_shops_updated_at ON shops; CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();` },
};

export default function SettingsPage() {
  const { isAdmin } = useRole();
  const [tab, setTab] = useState('general');
  const [config, setConfig] = useState({});
  const [saving, setSaving] = useState(false);
  const [dbStatus, setDbStatus] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [stats, setStats] = useState({ users: 0, products: 0, orders: 0, reports: 0 });
  const [expandedAgents, setExpandedAgents] = useState({});
  const [initModal, setInitModal] = useState(null);
  const [initLoading, setInitLoading] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allUsersLoading, setAllUsersLoading] = useState(false);
  const [allUsersPage, setAllUsersPage] = useState(1);
  const [allUsersTotal, setAllUsersTotal] = useState(0);
  const [allUsersSearch, setAllUsersSearch] = useState('');
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [modal, setModal] = useState(null);
  const [createForm, setCreateForm] = useState({ email: '', password: '', nom: '', role: 'viewer' });

  useEffect(() => {
    const saved = localStorage.getItem('odacontrol_settings');
    if (saved) { try { setConfig(JSON.parse(saved)); } catch {} }
    fetchStats();
    fetchAdmins();
  }, []);

  useEffect(() => {
    if (tab === 'users') fetchAllUsers();
  }, [tab, allUsersPage]);

  async function fetchStats() {
    try {
      const s = await supabase.auth.getSession();
      if (!s?.data?.session?.user?.id) return;
      const res = await fetch(`/api/admin?action=stats`, { headers: { 'x-admin-id': s.data.session.user.id } });
      const data = await res.json();
      setStats({ users: data.users || 0, products: data.produits?.total || 0, orders: data.commandes?.total || 0, reports: data.signalements || 0 });
    } catch {}
  }

  async function checkDB() {
    setDbLoading(true);
    try {
      const res = await fetch('/api/setup-db');
      const data = await res.json();
      setDbStatus(data.tables || {});
    } catch {}
    setDbLoading(false);
  }

  function setField(key, value) {
    setConfig(prev => ({ ...prev, [key]: value }));
  }

  async function saveSettings() {
    setSaving(true);
    localStorage.setItem('odacontrol_settings', JSON.stringify(config));
    await new Promise(r => setTimeout(r, 300));
    setSaving(false);
    toast('Paramètres enregistrés', 'success');
  }

  function toast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = 'adtoast ' + type;
    t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300) }, 3000);
  }

  async function api(method, body = {}, params = {}) {
    const qs = new URLSearchParams({ ...params, _t: Date.now() }).toString();
    const s = await supabase.auth.getSession();
    const res = await fetch(`/api/admin?${qs}`, {
      method, headers: { 'Content-Type': 'application/json', 'x-admin-id': s?.data?.session?.user?.id },
      body: method === 'POST' ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }

  async function fetchAdmins() {
    setLoadingAdmins(true);
    try {
      const res = await api('GET', {}, { action: 'admin_list' });
      setAdmins(res.admins || []);
    } catch {}
    setLoadingAdmins(false);
  }

  async function fetchAllUsers() {
    setAllUsersLoading(true);
    try {
      const res = await api('GET', {}, { action: 'users', page: String(allUsersPage) });
      setAllUsers(res.users || []);
      setAllUsersTotal(res.total || 0);
    } catch {}
    setAllUsersLoading(false);
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    if (!createForm.email || !createForm.password) { toast('Email et mot de passe requis', 'error'); return; }
    if (createForm.password.length < 6) { toast('Mot de passe : minimum 6 caractères', 'error'); return; }
    const res = await api('POST', {
      action: 'create_user', email: createForm.email, password: createForm.password,
      nom: createForm.nom, role: createForm.role,
    });
    if (res.success) {
      toast('✅ Utilisateur ' + createForm.email + ' créé');
      setCreateForm({ email: '', password: '', nom: '', role: 'viewer' });
      fetchAdmins();
    } else {
      toast('❌ ' + (res.error || 'Erreur'), 'error');
    }
  }

  async function handleUpdateRole(userId, newRole) {
    const res = await api('POST', { action: 'set_admin', userId, newRole });
    if (res.success) { toast('✅ Rôle mis à jour'); fetchAdmins(); fetchAllUsers(); setModal(null); }
    else { toast('❌ ' + (res.error || 'Erreur'), 'error'); }
  }

  async function handleRemoveAdmin(userId) {
    const res = await api('POST', { action: 'remove_admin', userId });
    if (res.success) { toast('✅ Droits retirés'); fetchAdmins(); fetchAllUsers(); setModal(null); }
    else { toast('❌ ' + (res.error || 'Erreur'), 'error'); }
  }

  async function handleDisconnect(userId) {
    if (!confirm('Déconnecter cet utilisateur de toutes ses sessions ?')) return;
    const res = await api('POST', { action: 'revoke_sessions', userId });
    if (res.success) { toast('✅ Utilisateur déconnecté'); }
    else { toast('❌ ' + (res.error || 'Erreur'), 'error'); }
  }

  async function handleDeleteUser(userId) {
    if (!confirm('⚠️ Supprimer définitivement cet utilisateur ? Action irréversible !')) return;
    const res = await api('POST', { action: 'delete_user', userId });
    if (res.success) { toast('✅ Utilisateur supprimé'); setModal(null); fetchAdmins(); }
    else { toast('❌ ' + (res.error || 'Erreur'), 'error'); }
  }

  async function handleBlockUser(userId) {
    const res = await api('POST', { action: 'block_user', userId });
    if (res.success) { toast('✅ Utilisateur bloqué'); fetchAdmins(); }
    else { toast('❌ ' + (res.error || 'Erreur'), 'error'); }
  }

  async function handleUnblockUser(userId) {
    const res = await api('POST', { action: 'unblock_user', userId });
    if (res.success) { toast('✅ Utilisateur débloqué'); fetchAdmins(); }
    else { toast('❌ ' + (res.error || 'Erreur'), 'error'); }
  }

  function copySQL(name, sql) {
    navigator.clipboard.writeText(sql);
    setCopied(name);
    setTimeout(() => setCopied(null), 2000);
  }

  const tabs = Object.entries(SETTINGS_SECTIONS).concat([['agents-config', { label: 'Configuration agents', icon: '🤖' }], ['users', { label: 'Utilisateurs', icon: '👥' }], ['quick', { label: 'Actions rapides', icon: '⚡' }]]);

  if (!isAdmin) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',flexDirection:'column',gap:12}}>
      <div style={{fontSize:'3rem'}}>🔒</div>
      <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#333'}}>Accès restreint</h2>
      <p style={{color:'#999',fontSize:'.85rem'}}>Seuls les administrateurs peuvent accéder aux paramètres.</p>
    </div>
  );

  return (
    <div>
      <div className="adpagehead" style={{marginBottom:20}}>
        <h2>⚙️ Paramètres</h2>
        <p>Configuration générale du système</p>
        <div style={{flex:1}}/>
        <span style={{fontSize:'.75rem',color:'#8e8e93'}}>{stats.users} utilisateurs · {stats.products} produits · {stats.orders} commandes</span>
      </div>

      {/* Stats cards */}
      <div className="adg" style={{gridTemplateColumns:'repeat(4,1fr)',marginBottom:20}}>
        <div className="adc" style={{padding:14,textAlign:'center'}}><div className="adcl">👥 Utilisateurs</div><div className="adcv" style={{fontSize:'1.4rem'}}>{stats.users}</div></div>
        <div className="adc" style={{padding:14,textAlign:'center'}}><div className="adcl">📦 Produits</div><div className="adcv" style={{fontSize:'1.4rem'}}>{stats.products}</div></div>
        <div className="adc" style={{padding:14,textAlign:'center'}}><div className="adcl">📋 Commandes</div><div className="adcv" style={{fontSize:'1.4rem'}}>{stats.orders}</div></div>
        <div className="adc" style={{padding:14,textAlign:'center'}}><div className="adcl">🚩 Signalements</div><div className="adcv" style={{fontSize:'1.4rem',color: stats.reports > 0 ? '#FF3B30' : '#34C759'}}>{stats.reports}</div></div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap'}}>
        {tabs.map(([key, t]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{
              padding:'8px 14px',borderRadius:8,border: tab === key ? '1.5px solid #1a1a2e' : '1px solid #e0e0e0',
              background: tab === key ? '#1a1a2e' : 'white',color: tab === key ? 'white' : '#555',
              fontSize:'.78rem',fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <div>
          <div className="adtw" style={{padding:24,marginBottom:20}}>
            <h3 className="adst" style={{marginBottom:16}}>➕ Créer un utilisateur</h3>
            <form onSubmit={handleCreateUser} style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <label style={{fontSize:'.72rem',fontWeight:600,color:'#555',display:'block',marginBottom:4}}>Email *</label>
                  <input className="adsrch" style={{width:'100%'}} type="email" value={createForm.email} onChange={e => setCreateForm(p => ({...p, email: e.target.value}))} required placeholder="exemple@gmail.com"/>
                </div>
                <div>
                  <label style={{fontSize:'.72rem',fontWeight:600,color:'#555',display:'block',marginBottom:4}}>Mot de passe *</label>
                  <input className="adsrch" style={{width:'100%'}} type="password" value={createForm.password} onChange={e => setCreateForm(p => ({...p, password: e.target.value}))} required placeholder="Min 6 caractères"/>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <label style={{fontSize:'.72rem',fontWeight:600,color:'#555',display:'block',marginBottom:4}}>Nom (optionnel)</label>
                  <input className="adsrch" style={{width:'100%'}} type="text" value={createForm.nom} onChange={e => setCreateForm(p => ({...p, nom: e.target.value}))} placeholder="Nom affiché"/>
                </div>
                <div>
                  <label style={{fontSize:'.72rem',fontWeight:600,color:'#555',display:'block',marginBottom:4}}>Rôle</label>
                  <select className="adsrch" style={{width:'100%',cursor:'pointer'}} value={createForm.role} onChange={e => setCreateForm(p => ({...p, role: e.target.value}))}>
                    <option value="admin">Admin — Accès complet</option>
                    <option value="viewer">Lecteur — Consultation seule</option>
                    <option value="super_admin">Super Admin — Accès complet + gestion rôles</option>
                  </select>
                </div>
              </div>
              <div style={{textAlign:'right',marginTop:4}}>
                <button type="submit" className="adbtn adbtn-primary">➕ Créer l'utilisateur</button>
              </div>
            </form>
          </div>

          <div className="adtw" style={{marginBottom:20}}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid #f0f0f0',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
              <h3 className="adst" style={{margin:0}}>👥 Utilisateurs avec accès ({admins.length})</h3>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input className="adsrch" placeholder="Rechercher..." value={allUsersSearch} onChange={e => setAllUsersSearch(e.target.value)} style={{width:180}}/>
              </div>
            </div>
            {loadingAdmins ? <div className="adld" style={{padding:40}}><div className="adsp"/></div> : (
              <table className="adtabl">
                <thead><tr><th>Utilisateur</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Inscrit le</th><th>Actions</th></tr></thead>
                <tbody>
                  {admins.filter(a => !allUsersSearch || a.user?.email?.toLowerCase().includes(allUsersSearch.toLowerCase()) || a.user?.nom?.toLowerCase().includes(allUsersSearch.toLowerCase())).map(a => {
                    const u = a.user || {};
                    const isBanned = !!a.user?.banned_until;
                    const roleLabel = a.role === 'super_admin' ? 'Super Admin' : a.role === 'admin' ? 'Admin' : a.role === 'viewer' ? 'Lecteur' : a.role === 'moderator' ? 'Modérateur' : a.role === 'support' ? 'Support' : '—';
                    return (
                    <tr key={a.user_id}>
                      <td style={{fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#007AFF,#5856D6)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'.65rem',fontWeight:700,flexShrink:0}}>
                          {u.photo ? <img src={u.photo} alt="" style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}}/> : u.nom?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        {u.nom}
                      </td>
                      <td style={{fontSize:'.78rem',color:'#666'}}>{u.email}</td>
                      <td><span className="adpill" style={{background: a.role === 'super_admin' ? '#1a1a2e' : a.role === 'admin' ? '#007AFF' : '#f5f5f5', color: a.role === 'super_admin' || a.role === 'admin' ? 'white' : '#666'}}>{roleLabel}</span></td>
                      <td>{isBanned ? <span className="adpill banned" style={{background:'#fce4ec',color:'#c62828'}}>Bloqué</span> : <span className="adpill actif" style={{background:'#e8f5e9',color:'#2e7d32'}}>Actif</span>}</td>
                      <td style={{fontSize:'.72rem',color:'#8e8e93'}}>{a.user?.created_at ? new Date(a.user.created_at).toLocaleDateString('fr-FR') : '—'}</td>
                      <td>
                        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                          <button className="adbtn adbtn-warning adbtn-sm" onClick={() => setModal({type:'role',user:{id:a.user_id,email:u.email,nom:u.nom},adminRole:a.role})}>Rôle</button>
                          <button className="adbtn adbtn-danger adbtn-sm" onClick={() => handleDisconnect(a.user_id)}>Déconn.</button>
                          {isBanned
                            ? <button className="adbtn adbtn-success adbtn-sm" onClick={() => handleUnblockUser(a.user_id)}>Débloquer</button>
                            : <button className="adbtn adbtn-danger adbtn-sm" onClick={() => handleBlockUser(a.user_id)}>Bloquer</button>
                          }
                          <button className="adbtn adbtn-danger adbtn-sm" onClick={() => setModal({type:'delete',user:{id:a.user_id,email:u.email,nom:u.nom}})}>Suppr.</button>
                        </div>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            )}
          </div>

          {/* Role change modal */}
          {modal?.type === 'role' && (
            <div className="admb" onClick={e => {if(e.target===e.currentTarget) setModal(null)}}>
              <div className="admcont">
                <div className="admhead"><span className="admtitle">Changer le rôle</span><button className="admclose" onClick={() => setModal(null)}>✕</button></div>
                <div className="admbody">
                  <p style={{fontSize:'.82rem',color:'#666',marginBottom:12}}>Utilisateur : <strong>{modal.user?.nom || modal.user?.email}</strong></p>
                  <p style={{fontSize:'.75rem',color:'#999',marginBottom:12}}>Rôle actuel : <strong>{modal.adminRole ? (modal.adminRole === 'super_admin' ? 'Super Admin' : modal.adminRole === 'admin' ? 'Admin' : 'Lecteur') : 'Aucun'}</strong></p>
                  {[{value:'admin',label:'Admin',desc:'Accès complet'},{value:'viewer',label:'Lecteur',desc:'Consultation seule'},{value:'super_admin',label:'Super Admin',desc:'Accès complet + gestion rôles'}].filter(o => o.value !== modal.adminRole).map(o => (
                    <button key={o.value} className="adbtn adbtn-ghost" style={{justifyContent:'flex-start',padding:'10px 14px',fontSize:'.82rem',width:'100%',marginBottom:4}}
                      onClick={() => handleUpdateRole(modal.user.id, o.value)}>
                      <strong style={{minWidth:80,display:'inline-block'}}>{o.label}</strong> — {o.desc}
                    </button>
                  ))}
                  {modal.adminRole && <button className="adbtn adbtn-danger adbtn-sm" style={{marginTop:8,width:'100%',justifyContent:'center'}} onClick={() => handleRemoveAdmin(modal.user.id)}>Retirer tous les droits</button>}
                </div>
              </div>
            </div>
          )}

          {/* Delete user modal */}
          {modal?.type === 'delete' && (
            <div className="admb" onClick={e => {if(e.target===e.currentTarget) setModal(null)}}>
              <div className="admcont">
                <div className="admhead"><span className="admtitle">Supprimer l'utilisateur</span><button className="admclose" onClick={() => setModal(null)}>✕</button></div>
                <div className="admbody">
                  <p style={{fontSize:'.85rem',color:'#FF3B30',lineHeight:1.6,fontWeight:600}}>⚠️ Action irréversible !</p>
                  <p style={{fontSize:'.85rem',color:'#666',lineHeight:1.6}}>Toutes les données de <strong>{modal.user?.nom || modal.user?.email}</strong> seront supprimées.</p>
                </div>
                <div className="admact">
                  <button className="adbtn adbtn-ghost" onClick={() => setModal(null)}>Annuler</button>
                  <button className="adbtn adbtn-danger" onClick={() => handleDeleteUser(modal.user.id)}>Supprimer</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* General Tab */}
      {tab === 'general' && (
        <div className="adtw" style={{padding:24}}>
          <h3 className="adst" style={{marginBottom:20}}>Configuration générale</h3>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {SETTINGS_SECTIONS.general.fields.map(f => (
              <div key={f.key}>
                <label style={{fontSize:'.72rem',fontWeight:600,color:'#555',display:'block',marginBottom:4}}>{f.label}</label>
                <input className="adsrch" style={{maxWidth:'100%'}} type={f.type} value={config[f.key] !== undefined ? config[f.key] : f.default} onChange={e => setField(f.key, e.target.value)} placeholder={f.placeholder || ''}/>
              </div>
            ))}
          </div>
          <div style={{marginTop:20,textAlign:'right'}}>
            <button className="adbtn adbtn-primary" onClick={saveSettings} disabled={saving}>{saving ? 'Enregistrement...' : '💾 Enregistrer'}</button>
          </div>
        </div>
      )}

      {/* WhatsApp Tab */}
      {tab === 'whatsapp' && (
        <div className="adtw" style={{padding:24}}>
          <h3 className="adst" style={{marginBottom:20}}>WhatsApp Business API</h3>
          <p className="adsd">Configuration de l'intégration WhatsApp pour la communication avec les vendeurs</p>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {SETTINGS_SECTIONS.whatsapp.fields.map(f => (
              <div key={f.key}>
                <label style={{fontSize:'.72rem',fontWeight:600,color:'#555',display:'block',marginBottom:4}}>{f.label}</label>
                <input className="adsrch" style={{maxWidth:'100%'}} type={f.type} value={config[f.key] !== undefined ? config[f.key] : f.default} onChange={e => setField(f.key, e.target.value)} placeholder={f.placeholder || ''}/>
              </div>
            ))}
          </div>
          <div style={{marginTop:20,padding:16,background:'#fff8e1',borderRadius:10,border:'1px solid #FFE082'}}>
            <strong style={{fontSize:'.78rem',color:'#E65100'}}>📖 Configuration requise</strong>
            <ol style={{margin:'8px 0 0',paddingLeft:18,fontSize:'.75rem',color:'#555',lineHeight:1.8}}>
              <li>Crée un compte WhatsApp Business API sur <strong>developers.facebook.com</strong></li>
              <li>Configure un webhook pour recevoir les messages entrants</li>
              <li>Copie la clé API dans le champ ci-dessus</li>
              <li>Ajoute le numéro de téléphone de l'entreprise</li>
              <li>Les messages seront envoyés automatiquement par les agents</li>
            </ol>
          </div>
          <div style={{marginTop:20,textAlign:'right'}}>
            <button className="adbtn adbtn-primary" onClick={saveSettings} disabled={saving}>{saving ? 'Enregistrement...' : '💾 Enregistrer'}</button>
          </div>
        </div>
      )}

      {/* Agents Tab */}
      {tab === 'agents' && (
        <div className="adtw" style={{padding:24}}>
          <h3 className="adst" style={{marginBottom:20}}>Configuration des agents IA</h3>
          <p className="adsd">Paramètres généraux pour le système multi-agents</p>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {SETTINGS_SECTIONS.agents.fields.map(f => (
              <div key={f.key}>
                <label style={{fontSize:'.72rem',fontWeight:600,color:'#555',display:'block',marginBottom:4}}>
                  {f.type === 'checkbox' ? (
                    <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',fontSize:'.82rem',fontWeight:500,color:'#333'}}>
                      <input type="checkbox" checked={config[f.key] !== undefined ? config[f.key] : f.default} onChange={e => setField(f.key, e.target.checked)} style={{width:18,height:18}}/>
                      {f.label}
                    </label>
                  ) : <>{f.label}</>}
                </label>
                {f.type !== 'checkbox' && (
                  <input className="adsrch" style={{maxWidth:'100%'}} type={f.type} value={config[f.key] !== undefined ? config[f.key] : f.default} onChange={e => setField(f.key, e.target.value)}/>
                )}
              </div>
            ))}
          </div>
          <div style={{marginTop:20,textAlign:'right'}}>
            <button className="adbtn adbtn-primary" onClick={saveSettings} disabled={saving}>{saving ? 'Enregistrement...' : '💾 Enregistrer'}</button>
          </div>
        </div>
      )}

      {/* Distribution Tab */}
      {tab === 'distribution' && (
        <div className="adtw" style={{padding:24}}>
          <h3 className="adst" style={{marginBottom:20}}>Configuration de la distribution</h3>
          <p className="adsd">URLs des applications ODA pour les campagnes de distribution massive</p>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {SETTINGS_SECTIONS.distribution.fields.map(f => (
              <div key={f.key}>
                <label style={{fontSize:'.72rem',fontWeight:600,color:'#555',display:'block',marginBottom:4}}>{f.label}</label>
                <input className="adsrch" style={{maxWidth:'100%'}} type={f.type} value={config[f.key] !== undefined ? config[f.key] : f.default} onChange={e => setField(f.key, e.target.value)}/>
              </div>
            ))}
          </div>
          <div style={{marginTop:20,textAlign:'right'}}>
            <button className="adbtn adbtn-primary" onClick={saveSettings} disabled={saving}>{saving ? 'Enregistrement...' : '💾 Enregistrer'}</button>
          </div>
        </div>
      )}

      {/* Agents Configuration Tab */}
      {tab === 'agents-config' && (
        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div>
              <h3 className="adst" style={{margin:0}}>🤖 Configuration des agents</h3>
              <p className="adsd">Activez les ressources nécessaires pour chaque agent. Un agent sans ses ressources reste endormi.</p>
            </div>
            <button className="adbtn adbtn-primary" onClick={saveSettings} disabled={saving}>
              {saving ? '🔄 Enregistrement...' : '💾 Enregistrer'}
            </button>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12, maxHeight:'calc(100vh - 300px)', overflowY:'auto', paddingRight:4, alignContent:'start'}}>
            {AGENTS_CONFIG.map(ag => {
              const allConfigured = ag.fields.every(f => config[`agentcfg_${f.key}`]);
              const isExpanded = expandedAgents[ag.key];
              return (
                <div key={ag.key} onClick={() => setExpandedAgents(p => ({...p, [ag.key]: !p[ag.key]}))} style={{
                  background:'white', borderRadius:16, border:`.5px solid ${allConfigured ? `${ag.color}40` : '#e5e7eb'}`,
                  boxShadow: allConfigured ? `0 2px 14px ${ag.color}18` : '0 1px 4px rgba(0,0,0,.04)',
                  cursor:'pointer', transition:'all .2s', overflow:'hidden',
                  display:'flex', flexDirection:'column',
                  minHeight: isExpanded ? 0 : 120,
                }}>
                  <div style={{
                    display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                    padding:'18px 14px 14px', textAlign:'center',
                    background: allConfigured ? `${ag.color}06` : '#fafafa',
                    borderBottom: isExpanded ? '.5px solid #f0f0f0' : 'none',
                  }}>
                    <div style={{width:44,height:44,borderRadius:12,background:`${ag.color}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem'}}>
                      {ag.emoji}
                    </div>
                    <div>
                      <div style={{fontWeight:700,fontSize:'.85rem',color:'#1a1a1a'}}>{ag.name}</div>
                      <div style={{fontSize:'.68rem',color:'#8e8e93',marginTop:1}}>{ag.role}</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{fontSize:'.65rem',padding:'2px 8px',borderRadius:20,fontWeight:600,
                        background: allConfigured ? '#E8F5E9' : '#FFF3E0',
                        color: allConfigured ? '#2E7D32' : '#E65100'}}>
                        {allConfigured ? '✅ Prêt' : '⚠️ Config requis'}
                      </span>
                      <span style={{fontSize:'.6rem',color:'#ccc',transition:'transform .2s',transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}}>▼</span>
                    </div>
                  </div>
                  {isExpanded && (
                  <div style={{padding:'12px 14px 16px', display:'flex',flexDirection:'column',gap:8}}>
                    {ag.fields.map(f => {
                      const storageKey = `agentcfg_${f.key}`;
                      const val = config[storageKey];
                      const isConfigured = !!val;
                      return (
                        <div key={f.key}>
                          <label style={{fontSize:'.68rem',fontWeight:600,color:'#666',display:'block',marginBottom:3}}>
                            {f.type === 'db' ? '🗄️' : f.type === 'api' ? '🔑' : '🔧'} {f.label}
                          </label>
                          {f.type === 'tools' ? (
                            <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:'.75rem',color:'#444'}}>
                              <input type="checkbox" checked={!!val} onChange={e => {e.stopPropagation(); setField(storageKey, e.target.checked ? '✓' : '')}} style={{width:15,height:15}}/>
                              Outils disponibles
                            </label>
                          ) : (
                            <input className="adsrch" style={{width:'100%',fontSize:'.72rem',padding:'6px 10px'}} type={f.type === 'api' ? 'password' : 'text'}
                              value={val || ''} onChange={e => {e.stopPropagation(); setField(storageKey, e.target.value)}}
                              placeholder={f.placeholder || `Configurer...`}/>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{marginTop:16,padding:16,background:'#F3E8FF',borderRadius:12,border:'1px solid #D8B4FE'}}>
            <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
              <span style={{fontSize:'1.2rem'}}>💡</span>
              <div style={{fontSize:'.78rem',color:'#6B21A8',lineHeight:1.6}}>
                <strong>Fonctionnement :</strong> Chaque agent a besoin de ressources (API, outils) pour fonctionner.
                La base de données Supabase est déjà connectée globalement.
                Sans ses ressources, l'agent reste en mode <strong>« endormi »</strong> dans le Agent Hub.
                Configurez chaque agent ici, puis allez dans le Agent Hub pour les voir se réveiller.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Database Tab */}
      {tab === 'database' && (
        <div>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
            <h3 className="adst" style={{margin:0}}>🗄️ Base de données</h3>
            <button className="adbtn adbtn-sm adbtn-ghost" onClick={checkDB} disabled={dbLoading}>
              {dbLoading ? '🔄' : '🔄 Vérifier'}
            </button>
          </div>
          <p className="adsd">État des tables Supabase — tout est vide ? Exécute le script complet ci-dessous.</p>

          {dbStatus && (
            <>
              {Object.values(dbStatus).every(s => s === 'manquante' || s === '❌ manquante') && (
                <div style={{background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:12,padding:'12px 16px',marginBottom:14,fontSize:'.78rem',color:'#92400E',lineHeight:1.6}}>
                  <strong>⚠️ Toutes les tables sont manquantes.</strong><br/>
                  C'est pourquoi tu vois <strong>0</strong> partout (produits, commandes, utilisateurs…).<br/>
                  Clique sur <strong>"🚀 Initialiser la base"</strong> pour tout créer d'un coup.
                </div>
              )}
              <div className="adg" style={{gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',marginBottom:20}}>
                {Object.entries(dbStatus).map(([name, state]) => (
                  <div key={name} className="adc" style={{padding:14,borderLeft: `3px solid ${state.startsWith('OK') ? '#34C759' : '#FF3B30'}`}}>
                    <div className="adcl" style={{fontSize:'.68rem'}}>{name}</div>
                    <div className="adcv" style={{fontSize:'.85rem',color: state.startsWith('OK') ? '#34C759' : '#FF3B30'}}>
                      {state.startsWith('OK') ? '✅ ' : '❌ '}{state}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <button className="adbtn adbtn-primary" style={{width:'100%',padding:14,fontSize:'.85rem',marginBottom:16}}
            onClick={async () => {
              setInitLoading(true);
              try {
                const res = await fetch('/api/init-db');
                const data = await res.json();
                if (data.success) {
                  checkDB();
                  toast('✅ Base de données initialisée avec succès !', 'success');
                } else {
                  setInitModal(data);
                }
              } catch {
                toast('❌ Erreur réseau', 'error');
              }
              setInitLoading(false);
            }}>
            {initLoading ? '⏳ Initialisation...' : '🚀 Initialiser la base de données'}
          </button>

          {initModal && (
            <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}} onClick={() => setInitModal(null)}>
              <div style={{background:'white',borderRadius:18,maxWidth:520,width:'90%',padding:24,boxShadow:'0 20px 60px rgba(0,0,0,.3)'}} onClick={e => e.stopPropagation()}>
                <h3 style={{margin:'0 0 8px',fontSize:'1rem'}}>⚙️ Configuration requise</h3>
                <p style={{fontSize:'.78rem',color:'#555',lineHeight:1.6,margin:'0 0 16px'}}>
                  {initModal.hint || 'Pour initialiser la base automatiquement, ajoute le mot de passe de ta base Supabase dans le fichier <code>.env.local</code> :'}
                </p>
                <div style={{background:'#1a1a2e',color:'#e8eaed',borderRadius:10,padding:14,marginBottom:16,fontSize:'.7rem',fontFamily:'monospace',wordBreak:'break-all'}}>
                  SUPABASE_DB_PASSWORD=ton_mot_de_passe
                </div>
                <div style={{display:'flex',gap:10,marginBottom:16}}>
                  <button className="adbtn adbtn-primary" style={{flex:1}}
                    onClick={() => {
                      const fullSQL = SQL_SECTIONS.core.sql + '\n' + SQL_SECTIONS.leads.sql + '\n' + SQL_SECTIONS.shops.sql + '\n' + SQL_SECTIONS.whatsapp.sql + '\n' + SQL_SECTIONS.distribution.sql + '\n' + SQL_SECTIONS.audit.sql + '\n' + SQL_SECTIONS.indexes.sql;
                      navigator.clipboard.writeText(fullSQL);
                      window.open('https://supabase.com/dashboard/project/xjckbqbqxcwzcrlmuvzf/sql/new', '_blank');
                      setInitModal(null);
                      toast('📋 SQL copié ! Colle-le dans Supabase SQL Editor et exécute', 'info');
                    }}>
                    📋 Copier SQL & ouvrir Supabase
                  </button>
                </div>
                <p style={{fontSize:'.72rem',color:'#999',margin:0,textAlign:'center'}}>
                  <strong>Étapes :</strong> Ouvre Supabase → Colle le SQL → Clique sur <strong>▶ Run</strong> → Reviens ici → <strong>Vérifier</strong>
                </p>
                <button onClick={() => setInitModal(null)} style={{display:'block',margin:'12px auto 0',border:'none',background:'none',color:'#999',fontSize:'.75rem',cursor:'pointer',fontFamily:'inherit'}}>Fermer</button>
              </div>
            </div>
          )}

          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {Object.entries(SQL_SECTIONS).map(([key, sec]) => (
              <div key={key} style={{background:'white',borderRadius:10,border:'1px solid #f0f0f0',overflow:'hidden'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'#fafafa',borderBottom:'1px solid #f0f0f0'}}>
                  <strong style={{fontSize:'.8rem'}}>{sec.name}</strong>
                  <button className="adbtn adbtn-sm adbtn-primary" onClick={() => copySQL(key, sec.sql)}>
                    {copied === key ? '✅ Copié' : '📋 Copier SQL'}
                  </button>
                </div>
                <pre style={{padding:12,margin:0,fontSize:'.65rem',lineHeight:1.4,background:'#1a1a2e',color:'#e8eaed',overflowX:'auto',maxHeight:120,overflowY:'auto',fontFamily:'monospace'}}>{sec.sql}</pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions Tab */}
      {tab === 'quick' && (
        <div>
          <h3 className="adst">⚡ Actions rapides</h3>
          <p className="adsd">Accès directs aux fonctionnalités principales</p>
          <div className="adg" style={{gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))'}}>
            {QUICK_ACTIONS.map((action, i) => (
              <div key={i} className="adc" style={{cursor:'pointer',padding:18}} onClick={() => window.location.href = action.url}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:40,height:40,background:'#f5f5f5',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem'}}>{action.icon}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:'.82rem'}}>{action.label}</div>
                    <div style={{fontSize:'.7rem',color:'#8e8e93',marginTop:2}}>{action.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{background:'#fff8e1',border:'1px solid #FFE082',borderRadius:14,padding:20,marginTop:20}}>
            <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
              <span style={{fontSize:'1.5rem'}}>📖</span>
              <div>
                <h4 style={{fontSize:'.9rem',fontWeight:700,margin:'0 0 6px',color:'#E65100'}}>Guide de démarrage rapide</h4>
                <ol style={{margin:0,paddingLeft:20,fontSize:'.78rem',color:'#555',lineHeight:1.8}}>
                  <li><strong>Configure les paramètres généraux</strong> dans l'onglet Général</li>
                  <li><strong>Initialise la base de données</strong> via l'onglet Base de données (exécute les scripts SQL dans Supabase)</li>
                  <li><strong>Configure les agents</strong> dans Agent Hub</li>
                  <li><strong>Importe des leads</strong> manuellement ou via WhatsApp</li>
                  <li><strong>Lance les campagnes</strong> de distribution depuis l'onglet Distribution</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
