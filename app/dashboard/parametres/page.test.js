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
    label: 'Général', icon: '⚙️',
    fields: [
      { key: 'app_name', label: "Nom de l'application", type: 'text', default: 'ODA Contrôle' },
      { key: 'platform_url', label: 'URL de la plateforme', type: 'text', default: typeof window !== 'undefined' ? window.location.origin : '' },
      { key: 'notification_email', label: 'Email de notification', type: 'email', default: '' },
    ]
  },
  whatsapp: {
    label: 'WhatsApp Business', icon: '💬',
    fields: [
      { key: 'whatsapp_business_phone', label: 'Numéro WhatsApp', type: 'text', default: '', placeholder: '+2376XXXXXXXX' },
      { key: 'whatsapp_api_key', label: 'Clé API WhatsApp', type: 'password', default: '', placeholder: '••••••••' },
      { key: 'whatsapp_template_name', label: 'Nom du template message', type: 'text', default: 'oda_welcome', placeholder: 'oda_welcome' },
    ]
  },
  agents: {
    label: 'Agents IA', icon: '🤖',
    fields: [
      { key: 'max_concurrent_agents', label: 'Agents concurrents max', type: 'number', default: '5' },
      { key: 'auto_lead_scoring', label: 'Scoring automatique des leads', type: 'checkbox', default: true },
      { key: 'auto_whatsapp_followup', label: 'Relance WhatsApp automatique', type: 'checkbox', default: false },
      { key: 'agent_timeout_minutes', label: "Timeout d'exécution (minutes)", type: 'number', default: '10' },
    ]
  },
  distribution: {
    label: 'Distribution', icon: '📲',
    fields: [
      { key: 'oda_market_url', label: 'URL ODA Market', type: 'text', default: 'https://oda-market.vercel.app' },
      { key: 'oda_seller_url', label: 'URL ODA Seller', type: 'text', default: 'https://oda-seller.vercel.app' },
    ]
  }
};

const AGENTS_CONFIG = [
  { key: 'orchestrator', name: 'DeerFlow', role: 'Orchestrateur IA', emoji: '🧠', color: '#3B82F6',
    fields: [{ type: 'tools', label: 'Orchestrateur de flux', key: 'orchestrator_tools' }]},
  { key: 'supervisor', name: 'Paul', role: 'Superviseur Qualité', emoji: '✅', color: '#E91E90',
    fields: [{ type: 'tools', label: 'Règles de validation', key: 'supervisor_tools' }]},
  { key: 'research', name: 'Sarah', role: 'Agent de Recherche', emoji: '🔍', color: '#B45309',
    fields: [{ type: 'api', label: 'API Facebook/Instagram', key: 'research_api', placeholder: 'Entrez la clé API...' }, { type: 'tools', label: 'Scraper web, Parsing HTML', key: 'research_tools' }]},
  { key: 'contact', name: 'Marc', role: 'Agent Contact', emoji: '💬', color: '#16A34A',
    fields: [{ type: 'api', label: 'WhatsApp Business API', key: 'contact_api', placeholder: 'Entrez la clé API WhatsApp...' }, { type: 'tools', label: 'Template messages WhatsApp', key: 'contact_tools' }]},
  { key: 'onboarding', name: 'Fatou', role: 'Agent Onboarding', emoji: '📋', color: '#EA580C',
    fields: [{ type: 'tools', label: 'Questionnaire structuré', key: 'onboarding_tools' }]},
  { key: 'account_creation', name: 'Koffi', role: 'Créateur de Comptes', emoji: '🔑', color: '#7C3AED',
    fields: [{ type: 'api', label: 'API Supabase (clés requises)', key: 'account_creation_api', placeholder: 'Entrez la clé API Supabase...' }, { type: 'tools', label: 'Générateur mot de passe', key: 'account_creation_tools' }]},
  { key: 'product_publishing', name: 'Awa', role: 'Agent Publication', emoji: '📦', color: '#A855F7',
    fields: [{ type: 'tools', label: 'Analyseur images, Générateur descriptions', key: 'product_publishing_tools' }]},
  { key: 'whatsapp_followup', name: 'Yann', role: 'Agent Suivi WhatsApp', emoji: '📱', color: '#059669',
    fields: [{ type: 'api', label: 'WhatsApp Business API', key: 'whatsapp_followup_api', placeholder: 'Entrez la clé API WhatsApp...' }, { type: 'tools', label: 'Template validation boutique', key: 'whatsapp_followup_tools' }]},
  { key: 'marketing', name: 'Eve', role: 'Agent Marketing', emoji: '📊', color: '#CA8A04',
    fields: [{ type: 'tools', label: 'Analyseur statistiques, Générateur A/B test', key: 'marketing_tools' }]},
];

const QUICK_ACTIONS = [
  { label: 'Dashboard Supabase', icon: '🗄️', url: 'https://app.supabase.com/project/xjckbqbqxcwzcrlmuvzf', desc: 'Accéder à la console Supabase' },
  { label: 'Gérer les utilisateurs', icon: '👥', url: '/dashboard/utilisateurs', desc: 'Liste des utilisateurs, blocs, rôles' },
  { label: 'Voir les logs', icon: '📋', url: '/dashboard/logs', desc: 'Journal des actions système' },
  { label: 'Agent Hub', icon: '🤖', url: '/dashboard/agent-hub', desc: 'Voir et configurer les agents' },
  { label: 'Pipeline leads', icon: '🎯', url: '/dashboard/leads', desc: 'Suivi des prospects vendeurs' },
  { label: 'Distribution', icon: '📲', url: '/dashboard/distribution', desc: 'QR codes et campagnes' },
];

const ROLES_MAP = { super_admin: 'Super Admin', admin: 'Admin', viewer: 'Lecteur' };
const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', desc: 'Accès complet à toutes les pages' },
  { value: 'viewer', label: 'Lecteur', desc: 'Consultation seule, sans modification' },
  { value: 'super_admin', label: 'Super Admin', desc: 'Accès complet + gestion des rôles' },
];

export default function SettingsPage() {
  const { isAdmin } = useRole();
  const [tab, setTab] = useState('users');
  const [config, setConfig] = useState({});
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ users: 0, products: 0, orders: 0, reports: 0 });
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [expandedAgents, setExpandedAgents] = useState({});
  const [createForm, setCreateForm] = useState({ email: '', password: '', nom: '', role: 'viewer' });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const saved = localStorage.getItem('odacontrol_settings');
    if (saved) { try { setConfig(JSON.parse(saved)); } catch {} }
    fetchStats();
    fetchAdmins();
  }, []);

  async function fetchStats() {
    try {
      const s = await supabase.auth.getSession();
      if (!s?.data?.session?.user?.id) return;
      const res = await fetch(`/api/admin?action=stats`, { headers: { 'x-admin-id': s.data.session.user.id } });
      const data = await res.json();
      setStats({ users: data.users || 0, products: data.produits?.total || 0, orders: data.commandes?.total || 0, reports: data.signalements || 0 });
    } catch {}
  }

  async function fetchAdmins() {
    setLoadingAdmins(true);
    try {
      const s = await supabase.auth.getSession();
      if (!s?.data?.session?.user?.id) return;
      const res = await fetch(`/api/admin?action=admin_list`, { headers: { 'x-admin-id': s.data.session.user.id } });
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch {}
    setLoadingAdmins(false);
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

  async function handleCreateUser(e) {
    e.preventDefault();
    if (!createForm.email || !createForm.password) { showToast('Email et mot de passe requis', 'error'); return; }
    if (createForm.password.length < 6) { showToast('Mot de passe : minimum 6 caractères', 'error'); return; }
    const res = await api('POST', {
      action: 'create_user',
      email: createForm.email,
      password: createForm.password,
      nom: createForm.nom,
      role: createForm.role,
    });
    if (res.success) {
      showToast(`✅ Utilisateur ${createForm.email} créé avec le rôle ${ROLES_MAP[createForm.role]}`);
      setCreateForm({ email: '', password: '', nom: '', role: 'viewer' });
      fetchAdmins();
    } else {
      showToast(`❌ ${res.error || 'Erreur'}`, 'error');
    }
  }

  async function handleUpdateRole(userId, newRole) {
    const res = await api('POST', { action: 'set_admin', userId, newRole });
    if (res.success) {
      showToast(`✅ Rôle mis à jour`);
      fetchAdmins();
      setModal(null);
    } else {
      showToast(`❌ ${res.error || 'Erreur'}`, 'error');
    }
  }

  async function handleRemoveAdmin(userId) {
    const res = await api('POST', { action: 'remove_admin', userId });
    if (res.success) {
      showToast(`✅ Droits retirés`);
      fetchAdmins();
      setModal(null);
    } else {
      showToast(`❌ ${res.error || 'Erreur'}`, 'error');
    }
  }

  async function handleDisconnect(userId) {
    if (!confirm('Déconnecter cet utilisateur de toutes ses sessions ?')) return;
    const res = await api('POST', { action: 'revoke_sessions', userId });
    if (res.success) {
      showToast(`✅ Utilisateur déconnecté`);
    } else {
      showToast(`❌ ${res.error || 'Erreur'}`, 'error');
    }
  }

  function setField(key, value) {
    setConfig(prev => ({ ...prev, [key]: value }));
  }

  async function saveSettings() {
    setSaving(true);
    localStorage.setItem('odacontrol_settings', JSON.stringify(config));
    await new Promise(r => setTimeout(r, 300));
    setSaving(false);
    showToast('Paramètres enregistrés', 'success');
  }

  const tabs = [
    ['users', { label: 'Utilisateurs', icon: '👥' }],
    ...Object.entries(SETTINGS_SECTIONS),
    ['agents-config', { label: 'Configuration agents', icon: '🤖' }],
    ['quick', { label: 'Actions rapides', icon: '⚡' }],
  ];

  
export default function SettingsPage() {
  const { isAdmin } = useRole();
  return <div>test</div>;
}
