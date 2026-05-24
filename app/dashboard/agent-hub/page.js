'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { SvgIcon } from '../../../lib/icons';
import { createClient } from '@supabase/supabase-js';
import { useRole } from '../RoleContext';

const AGENTS = [
  { key: 'orchestrator', name: 'Kwelly', role: 'Orchestrateur IA', color: '#3B82F6', float: 'f0', cpu: 34, ram: 512,
    desc: "Chef d'orchestre du système. Planifie, délègue, synchronise tous les agents et consolide les résultats finaux.",
    tasks: ['Coordination globale des agents', 'Planification et priorisation', 'Gestion des dépendances', 'Consolidation des rapports finaux'],
    feed: ['Pipeline Mode Douala lancé', '3 agents activés en parallèle', 'Rapport final envoyé'],
    metrics: { runs: 1204, success: 1198, tokens: '2.4M' }, thoughts: ['Je coordonne tout', 'Délégation à SA-1...', 'Pipeline en cours', 'Résultats consolidés'],
    problems: ['Agent lent...', 'Données manquantes', 'Connexion instable'], errors: ['Erreur 503', 'Timeout dépassé', 'Réponse invalide'],
    greeting: 'Bonjour, je suis Kwelly, votre orchestrateur principal. Je coordonne tous les agents du système ODA.',
    wakeAnim: 'fadeScaleUp', comms: [{ to: 'supervisor', msg: 'Lance le contrôle qualité !' }, { to: 'research', msg: 'Trouve 50 vendeurs Mode Douala' }],
    requires: { db: 'Base de données PostgreSQL', api: false, tools: ['Orchestrateur de flux'] } },
  { key: 'supervisor', name: 'Paul', role: 'Superviseur Qualité', color: '#E91E90', float: 'f1', cpu: 12, ram: 128,
    desc: 'Vérifie la qualité de chaque étape du pipeline. Valide ou rejette les résultats.',
    tasks: ['Validation qualité chaque étape', 'Déclenchement corrections auto', 'Rapport QA à Kwelly', 'Gestion des retries'],
    feed: ['Boutique#34 : PASS', 'Lead#51 données incomplètes', 'Retry déclenché x1'],
    metrics: { runs: 892, success: 881, tokens: '890K' }, thoughts: ['Vérification boutique...', 'Qualité insuffisante', 'Tout semble correct !'],
    greeting: 'Bonjour, je suis Paul, superviseur qualité. Je valide chaque étape avant publication.',
    wakeAnim: 'rotateIn', comms: [{ to: 'orchestrator', msg: 'Boutique#34 validée' }, { to: 'onboarding', msg: 'Données incomplètes' }],
    requires: { db: 'Base de données', api: false, tools: ['Règles de validation'] } },
  { key: 'research', name: 'Sarah', role: 'Agent de Recherche', color: '#B45309', float: 'f2', cpu: 28, ram: 256,
    desc: 'Scrute Facebook, Instagram et Google pour trouver les vendeurs actifs au Cameroun.',
    tasks: ['Scraping Facebook & Instagram', 'Extraction données publiques', 'Qualification leads', 'Production liste prospects'],
    feed: ['247 leads qualifiés', 'Scan IG +500 abonnés actif', 'Mode Douala : 89 leads'],
    metrics: { runs: 347, success: 339, tokens: '1.1M' }, thoughts: ['Je scrute Instagram...', '247 leads !', 'Qualification en cours...'],
    greeting: 'Bonjour, je suis Sarah. Je parcours les réseaux pour trouver les meilleurs vendeurs.',
    wakeAnim: 'slideUp', comms: [{ to: 'orchestrator', msg: '47 nouveaux leads !' }, { to: 'contact', msg: 'Liste prête !' }],
    requires: { db: 'Base de données', api: 'API Facebook/Instagram ou Playwright', tools: ['Scraper web', 'Parsing HTML'] } },
  { key: 'contact', name: 'Farida', role: 'Agent Contact', color: '#16A34A', float: 'f0', cpu: 18, ram: 192,
    desc: "Contacte les vendeurs via WhatsApp. Présente l'offre ODA gratuite.",
    tasks: ['Envoi messages WhatsApp', 'Présentation offre ODA', 'Collecte consentement', 'Arrêt si refus'],
    feed: ['89 messages envoyés', '61/89 consentements', 'Template B : meilleur taux'],
    metrics: { runs: 213, success: 154, tokens: '678K' }, thoughts: ['Bonjour !', 'Template B est mieux', 'Consentement obtenu !'],
    greeting: 'Bonjour, je suis Farida. Je contacte les vendeurs et les aide à rejoindre ODA.',
    wakeAnim: 'bounceIn', comms: [{ to: 'orchestrator', msg: '61 consentements !' }, { to: 'onboarding', msg: 'Lead#42 prêt' }],
    requires: { db: 'Base de données', api: 'WhatsApp Business API (clé API requise)', tools: ['Template messages WhatsApp'] } },
  { key: 'onboarding', name: 'Fatou', role: 'Agent Onboarding', color: '#EA580C', float: 'f1', cpu: 8, ram: 96,
    desc: 'Pose un questionnaire structuré au vendeur et gère les réponses incomplètes.',
    tasks: ['Questionnaire structuré', 'Collecte données vendeur', 'Réception logo/catalogue', 'Relances si nécessaire'],
    feed: ['Questionnaire en cours', 'Logo manquant → relance', 'Données structurées OK'],
    metrics: { runs: 61, success: 44, tokens: '445K' }, thoughts: ['Quelle est votre ville ?', 'Logo manquant...', 'Données OK !'],
    greeting: 'Bonjour, je suis Fatou. Je recueille les informations des nouveaux vendeurs.',
    wakeAnim: 'stretchIn', comms: [{ to: 'supervisor', msg: 'Profil complet !' }, { to: 'contact', msg: 'Infos incomplètes' }],
    requires: { db: 'Base de données', api: false, tools: ['Questionnaire structuré'] } },
  { key: 'account_creation', name: 'Koffi', role: 'Créateur de Comptes', color: '#7C3AED', float: 'f2', cpu: 15, ram: 160,
    desc: 'Crée le compte utilisateur sur ODA, génère un mot de passe et configure la boutique.',
    tasks: ['Création compte Supabase', 'Génération mot de passe', 'Configuration boutique', 'Transmission identifiants'],
    feed: ['Boutique#34 créée', 'shop_id: 7f3e...ab2', 'Config : 100%'],
    metrics: { runs: 44, success: 44, tokens: '112K' }, thoughts: ['INSERT INTO shops...', 'Mot de passe généré !', 'Boutique configurée'],
    greeting: 'Bonjour, je suis Koffi. Je crée les comptes et les boutiques sur la plateforme.',
    wakeAnim: 'popIn', comms: [{ to: 'product_publishing', msg: 'Boutique prête !' }, { to: 'supervisor', msg: 'Compte créé' }],
    requires: { db: 'Supabase (clés API requises)', api: 'API Supabase', tools: ['Générateur mot de passe'] } },
  { key: 'product_publishing', name: 'Awa', role: 'Agent Publication', color: '#A855F7', float: 'f0', cpu: 22, ram: 384,
    desc: 'Analyse les images, génère les descriptions et publie les produits sur ODA.',
    tasks: ['Analyse images produits', 'Génération descriptions', 'Catégorisation', 'Publication et vérification'],
    feed: ['12/12 produits publiés', 'Catégories auto OK', 'Contrôle qualité : PASS'],
    metrics: { runs: 38, success: 36, tokens: '2.1M' }, thoughts: ['Description générée !', '12 produits parfait', 'Publication réussie !'],
    greeting: 'Bonjour, je suis Awa. Je publie les produits avec des descriptions attrayantes.',
    wakeAnim: 'expandIn', comms: [{ to: 'supervisor', msg: '12/12 publiés' }, { to: 'orchestrator', msg: 'Boutique#34 prête' }],
    requires: { db: 'Base de données', api: false, tools: ['Analyseur images', 'Générateur descriptions'] } },
  { key: 'whatsapp_followup', name: 'Oceane', role: 'Agent Suivi WhatsApp', color: '#059669', float: 'f1', cpu: 6, ram: 64,
    desc: "Envoie le lien boutique et les identifiants. Demande la validation finale du vendeur.",
    tasks: ['Envoi lien boutique', 'Guide téléchargement app', 'Demande validation finale', 'Activation/suppression'],
    feed: ['Boutique#34 validée', '28/34 boutiques actives', '6 en attente réponse'],
    metrics: { runs: 34, success: 28, tokens: '234K' }, thoughts: ['Votre boutique est prête !', 'Il a dit OUI !', 'Activation !'],
    greeting: 'Bonjour, je suis Oceane. Je transmets les accès et valide les boutiques.',
    wakeAnim: 'gentleRise', comms: [{ to: 'orchestrator', msg: 'Boutique#34 validée !' }, { to: 'supervisor', msg: 'Validation OK' }],
    requires: { db: 'Base de données', api: 'WhatsApp Business API (clé API requise)', tools: ['Template validation boutique'] } },
  { key: 'marketing', name: 'Eve', role: 'Agent Marketing', color: '#CA8A04', float: 'f2', cpu: 10, ram: 80,
    desc: "Optimise les messages via tests A/B et améliore le taux de conversion.",
    tasks: ['Tests A/B templates', 'Personnalisation messages', 'Analyse conversion', 'Optimisation continue'],
    feed: ['Template B : +12% CTR', 'Heure optimale : 18h-20h', 'Campagne Mode Douala'],
    metrics: { runs: 18, success: 17, tokens: '560K' }, thoughts: ['Template B gagne !', '+12% de conversion !', 'A/B test en cours...'],
    greeting: 'Bonjour, je suis Eve. J\'optimise les campagnes pour attirer plus de vendeurs.',
    wakeAnim: 'flipIn', comms: [{ to: 'contact', msg: 'Utilise Template B !' }, { to: 'orchestrator', msg: '+12% ce mois' }],
    requires: { db: 'Base de données', api: false, tools: ['Analyseur statistiques', 'Générateur A/B test'] } },
];

const STATUSES_INIT = {
  orchestrator: 'running', supervisor: 'running', research: 'running',
  contact: 'running', onboarding: 'waiting', account_creation: 'success',
  product_publishing: 'success', whatsapp_followup: 'waiting', marketing: 'idle',
};

const ST = {
  running: { col: '#3B82F6', label: 'En cours', pulse: true, sat: 1, dim: 0, ring: true, shadowAlpha: .32 },
  success: { col: '#22C55E', label: 'Succès', pulse: false, sat: 1, dim: 0, ring: false, shadowAlpha: .22 },
  waiting: { col: '#F59E0B', label: 'En attente', pulse: true, sat: .65, dim: .18, ring: true, shadowAlpha: .14 },
  idle: { col: '#94A3B8', label: 'En veille', pulse: false, sat: .38, dim: .28, ring: false, shadowAlpha: .06 },
  failed: { col: '#EF4444', label: 'Échoué', pulse: false, sat: .5, dim: .22, ring: false, shadowAlpha: .1 },
  inactive: { col: '#6B7280', label: 'Inactif', pulse: false, sat: 0, dim: .6, ring: false, shadowAlpha: 0 },
  sleeping: { col: '#6B7280', label: 'Endormi', pulse: false, sat: .2, dim: .45, ring: false, shadowAlpha: .04 },
};

function loadAgentConfigsFromSettings() {
  const saved = localStorage.getItem('odacontrol_settings');
  if (!saved) return {};
  try {
    const all = JSON.parse(saved);
    const reqs = {};
    AGENTS.forEach(a => {
      const cfg = {};
      if (a.requires) {
        if (a.requires.db) cfg.db = true;
        if (a.requires.api) cfg.api = !!all[`agentcfg_${a.key}_api`];
        if (a.requires.tools) cfg.tools = !!all[`agentcfg_${a.key}_tools`];
      }
      reqs[a.key] = cfg;
    });
    return reqs;
  } catch { return {}; }
}

function dk(h, a = 55) { const n = parseInt(h.replace('#',''),16); const f=v=>Math.max(0,v-a).toString(16).padStart(2,'0'); return `#${f(n>>16&255)}${f(n>>8&255)}${f(n&255)}`; }
function lk(h, a = 50) { const n = parseInt(h.replace('#',''),16); const f=v=>Math.min(255,v+a).toString(16).padStart(2,'0'); return `#${f(n>>16&255)}${f(n>>8&255)}${f(n&255)}`; }

function AgentHead({ agent, status, size = 120, blink, lookDir, tilt, thought, comm, isDisabled, wakeAnim, isSleeping }) {
  const col = isDisabled ? '#6B7280' : (isSleeping ? '#6B7280' : agent.color);
  const st = isSleeping ? ST.sleeping : (isDisabled ? ST.inactive : (ST[status] || ST.idle));
  const cx = 60, cy = size * .52, rx = size * .46, ry = size * .44;
  const W = size, H = size, eyeBaseX = W * .185, eyeY = cy - ry * .06, eyeR = W * .082;
  const pOff = (lookDir || 0) * W * .046, eyeSY = blink ? .06 : 1;
  const shadowY = cy + ry + 2;
  const animName = (isDisabled || isSleeping) ? 'none' : (wakeAnim || agent.float);

  return (
    <div style={{ position: 'relative', width: W, height: H + 48 }}>
      {thought && (
        <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', zIndex: 20, animation: 'popIn .3s ease', pointerEvents: 'none' }}>
          <div style={{ background: '#fff', border: `.5px solid ${col}40`, borderRadius: 12, padding: '6px 10px', fontSize: 10, color: '#555', textAlign: 'center', maxWidth: 150, whiteSpace: 'normal', position: 'relative', boxShadow: `0 4px 12px ${col}20` }}>
            {thought === '...' ? (
              <span style={{ display: 'inline-flex', gap: 3 }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: col, animation: 'dotBounce .85s ease infinite' }}/>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: col, animation: 'dotBounce .85s ease infinite .14s' }}/>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: col, animation: 'dotBounce .85s ease infinite .28s' }}/>
              </span>
            ) : thought}
            <div style={{ position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `8px solid ${col}40` }}/>
          </div>
        </div>
      )}
      <div style={{ height: H, animation: animName, position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} overflow="visible">
          <defs>
            <radialGradient id={`gh-${agent.key}`} cx="32%" cy="26%" r="70%">
              <stop offset="0%" stopColor={isSleeping ? '#9CA3AF' : lk(col,55)}/><stop offset="30%" stopColor={isSleeping ? '#6B7280' : col}/>
              <stop offset="72%" stopColor={isSleeping ? '#4B5563' : dk(col,38)}/><stop offset="100%" stopColor={isSleeping ? '#374151' : dk(col,80)}/>
            </radialGradient>
            <radialGradient id={`sp-${agent.key}`} cx="28%" cy="22%" r="32%">
              <stop offset="0%" stopColor="#fff" stopOpacity=".22"/><stop offset="100%" stopColor="#fff" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id={`rm-${agent.key}`} cx="82%" cy="55%" r="36%">
              <stop offset="0%" stopColor="#000" stopOpacity=".28"/><stop offset="100%" stopColor="#000" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id={`sh-${agent.key}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000" stopOpacity=".22"/><stop offset="100%" stopColor="#000" stopOpacity="0"/>
            </radialGradient>
            <filter id={`blur-${agent.key}`}><feGaussianBlur stdDeviation="2.5"/></filter>
            <filter id={`fs-${agent.key}`}>
              <feColorMatrix type="saturate" values={isSleeping ? 0.15 : st.sat}/>
              <feComponentTransfer>
                <feFuncR type="linear" slope={isSleeping ? 0.5 : 1-st.dim}/><feFuncG type="linear" slope={isSleeping ? 0.5 : 1-st.dim}/><feFuncB type="linear" slope={isSleeping ? 0.5 : 1-st.dim}/>
              </feComponentTransfer>
            </filter>
          </defs>
          <ellipse cx={cx} cy={shadowY+4} rx={rx*.72} ry={ry*.12} fill={`url(#sh-${agent.key})`} filter={`url(#blur-${agent.key})`}/>
          <g filter={`url(#fs-${agent.key})`}>
            <g transform={tilt?`rotate(${tilt},${cx},${cy})`:undefined}>
              <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#gh-${agent.key})`}/>
              <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#sp-${agent.key})`}/>
              <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#rm-${agent.key})`}/>
              <ellipse cx={cx} cy={cy+ry*.55} rx={rx*.8} ry={ry*.38} fill="#000" fillOpacity=".10"/>
              <ellipse cx={cx-eyeBaseX+pOff} cy={eyeY} rx={eyeR} ry={eyeR*eyeSY} fill="#0d0d14"/>
              <ellipse cx={cx+eyeBaseX+pOff} cy={eyeY} rx={eyeR} ry={eyeR*eyeSY} fill="#0d0d14"/>
              {!blink && <>
                <circle cx={cx-eyeBaseX+pOff-eyeR*.28} cy={eyeY-eyeR*.3} r={eyeR*.28} fill="#fff" opacity=".65"/>
                <circle cx={cx+eyeBaseX+pOff-eyeR*.28} cy={eyeY-eyeR*.3} r={eyeR*.28} fill="#fff" opacity=".65"/>
              </>}
              {isSleeping && <text x={cx} y={cy+4} textAnchor="middle" fill="#fff" fontSize="20" opacity=".5">💤</text>}
            </g>
          </g>
          {st.ring && <circle cx={cx} cy={cy} r={rx+6} fill="none" stroke={col} strokeWidth="1.8" strokeOpacity=".5" strokeDasharray="9 5" style={{animation:'spinDash 2.2s linear infinite'}}/>}
        </svg>
      </div>
    </div>
  );
}

export default function AgentHubPage() {
  const { isAdmin } = useRole();
  const [selected, setSelected] = useState(null);
  const [statuses, setStatuses] = useState(STATUSES_INIT);
  const [disabled, setDisabled] = useState({});
  const [anims, setAnims] = useState({});
  const [feedItems, setFeedItems] = useState([
    { time: '14:41:03', from: 'Farida', to: 'Kwelly', msg: '61 consentements obtenus !', color: '#16A34A' },
    { time: '14:40:58', from: 'Paul', to: 'Fatou', msg: 'Données incomplètes, relance !', color: '#E91E90' },
    { time: '14:40:52', from: 'Awa', to: 'Kwelly', msg: 'Boutique#34 prête à valider !', color: '#A855F7' },
    { time: '14:40:44', from: 'Sarah', to: 'Farida', msg: 'Liste prête, à toi de jouer !', color: '#B45309' },
    { time: '14:40:31', from: 'Oceane', to: 'Kwelly', msg: 'Boutique#34 validée par vendeur !', color: '#059669' },
  ]);
  const [kpis, setKpis] = useState({ leads: 247, shops: 34, conv: 13.8 });
  const [waitingAgents, setWaitingAgents] = useState({});
  const [allOff, setAllOff] = useState(false);
  const [agentMode, setAgentMode] = useState('idle'); // 'idle' | 'simulation' | 'work'
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedContacts, setImportedContacts] = useState([]);
  const [importMsg, setImportMsg] = useState(null);
  const [agentReqs, setAgentReqs] = useState({});
  const [configModal, setConfigModal] = useState(null);
  const [modeSecondaire, setModeSecondaire] = useState(false);
  const intervalRef = useRef(null);
  const commIntervalRef = useRef(null);
  const kpiIntervalRef = useRef(null);
  const tickRef = useRef(0);
  const fileInputRef = useRef(null);
  const modeSecondaireRef = useRef(false);
  const [aiConnected, setAiConnected] = useState(true);
  const aiRef = useRef(true);
  const prevAiRef = useRef(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const writeLog = useCallback(async ({ action, severity, agent_key, details }) => {
    try {
      let agent_id = null;
      if (agent_key) {
        const { data: agent } = await supabase.from('agents').select('id').eq('key', agent_key).single();
        if (agent) agent_id = agent.id;
      }
      await supabase.from('audit_logs').insert({ action, severity, agent_id, details: details || null });
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      fetch('/api/health', { signal: AbortSignal.timeout(5000) })
        .then(r => r.ok).then(ok => { if (!cancelled) { setAiConnected(ok); aiRef.current = ok; } })
        .catch(() => { if (!cancelled) { setAiConnected(false); aiRef.current = false; } });
    };
    check();
    const id = setInterval(check, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    if (aiConnected === prevAiRef.current) return;
    prevAiRef.current = aiConnected;
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (aiConnected) {
      setFeedItems(p => [{ time: now, from: 'Système', to: 'Tous', msg: '🟢 IA connectée — Agents opérationnels', color: '#22C55E', urgent: true }, ...p.slice(0, 7)]);
      writeLog({ action: 'ai_connected', severity: 'info', agent_key: 'orchestrator', details: { status: 'connected' } });
    } else {
      setFeedItems(p => [{ time: now, from: 'Système', to: 'Tous', msg: '🔴 IA déconnectée — Agents en mode dégradé', color: '#EF4444', urgent: true }, ...p.slice(0, 7)]);
    }
  }, [aiConnected]);

  const updateAnim = useCallback((key, updates) => setAnims(prev => ({ ...prev, [key]: { ...prev[key], ...updates } })), []);

  const isSleeping = useCallback((agentKey) => {
    const reqs = agentReqs[agentKey];
    if (!reqs) return false;
    const agent = AGENTS.find(a => a.key === agentKey);
    if (!agent || !agent.requires) return false;
    const r = agent.requires;
    if (r.db && !reqs.db) return true;
    if (r.api && !reqs.api) return true;
    if (r.tools && r.tools.length && !reqs.tools) return true;
    return false;
  }, [agentReqs]);

  const getMissingReqs = useCallback((agentKey) => {
    const missing = [];
    const agent = AGENTS.find(a => a.key === agentKey);
    if (!agent || !agent.requires) return missing;
    const reqs = agentReqs[agentKey];
    const r = agent.requires;
    if (r.db && !reqs?.db) missing.push({ type: 'db', label: r.db });
    if (r.api && !reqs?.api) missing.push({ type: 'api', label: r.api });
    if (r.tools && r.tools.length && !reqs?.tools) missing.push({ type: 'tools', label: r.tools.join(', ') });
    return missing;
  }, [agentReqs]);

  const handleSleepAll = () => {
    setAgentMode('idle');
    const all = {};
    AGENTS.forEach(a => { all[a.key] = true; });
    setDisabled(all);
    setAllOff(true);
    AGENTS.forEach(a => updateAnim(a.key, { thought: '💤 Endormi...' }));
    setTimeout(() => AGENTS.forEach(a => updateAnim(a.key, { thought: null })), 2000);
    setFeedItems(p => [{ time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
      from: 'Système', to: 'Tous', msg: '💤 Tous les agents endormis', color: '#6B7280', urgent: true }, ...p.slice(0, 7)]);
  };

  const handleSimulateAll = () => {
    setAgentMode('simulation');
    const all = {};
    AGENTS.forEach(a => { all[a.key] = false; });
    setDisabled(all);
    setAllOff(false);
    setStatuses(prev => {
      const next = {};
      Object.keys(prev).forEach(k => { next[k] = 'running'; });
      return next;
    });
    AGENTS.forEach(a => updateAnim(a.key, { thought: '🎯 Mode Simulation' }));
    setTimeout(() => AGENTS.forEach(a => updateAnim(a.key, { thought: null })), 2000);
    setFeedItems(p => [{ time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
      from: 'Système', to: 'Tous', msg: '🎯 Mode Simulation activé — Agents simulés', color: '#F59E0B', urgent: true }, ...p.slice(0, 7)]);
  };

  const handleWorkAll = async () => {
    setAgentMode('work');
    const all = {};
    AGENTS.forEach(a => { all[a.key] = false; });
    setDisabled(all);
    setAllOff(false);
    setStatuses(prev => {
      const next = {};
      Object.keys(prev).forEach(k => { next[k] = 'running'; });
      return next;
    });
    AGENTS.forEach(a => updateAnim(a.key, { thought: '🚀 Mode Travail Réel' }));
    setTimeout(() => AGENTS.forEach(a => updateAnim(a.key, { thought: null })), 2000);
    setFeedItems(p => [{ time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
      from: 'Système', to: 'Tous', msg: '🚀 Mode Travail Réel activé — Campagne en cours...', color: '#22C55E', urgent: true }, ...p.slice(0, 7)]);
    try {
      const res = await fetch('/api/agents/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'contact', batchSize: 20 }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedItems(p => [{
          time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
          from: 'Système', to: 'Tous',
          msg: `📬 ${data.sent} messages envoyés / ${data.failed} échec(s) sur ${data.processed} leads`,
          color: data.failed > 0 ? '#F59E0B' : '#22C55E', urgent: true
        }, ...p.slice(0, 7)]);
        writeLog({ action: 'campaign_contact', severity: 'info', details: data });
      } else {
        setFeedItems(p => [{ time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
          from: 'Système', to: 'Tous', msg: `⚠️ Erreur campagne: ${data.error || data.message || 'Inconnue'}`, color: '#ef4444', urgent: true }, ...p.slice(0, 7)]);
      }
    } catch (err) {
      setFeedItems(p => [{ time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
        from: 'Système', to: 'Tous', msg: `❌ Erreur: ${err.message}`, color: '#ef4444', urgent: true }, ...p.slice(0, 7)]);
    }
  };

  const processAgentPipeline = useCallback((contacts) => {
    const total = contacts.length;
    const batchSize = 5;
    const batches = [];
    for (let i = 0; i < total; i += batchSize) batches.push(contacts.slice(i, i + batchSize));
    const now = () => new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});

    const runStage = (stageIdx) => {
      if (stageIdx >= batches.length) {
        setStatuses(prev => ({ ...prev, orchestrator: 'success' }));
        setFeedItems(p => [{ time: now(), from: 'Kwelly', to: 'Tous', msg: `✅ Pipeline terminé — ${total} contacts traités !`, color: '#3B82F6', urgent: true }, ...p.slice(0, 7)]);
        writeLog({ action: 'pipeline_end', severity: 'info', agent_key: 'orchestrator', details: { total_contacts: total, status: 'success' } });
        return;
      }
      const batch = batches[stageIdx];
      const names = batch.map(c => c.full_name || c.phone || 'contact').join(', ');

      // Stage 1: Sarah (Research) qualifies
      setStatuses(prev => ({ ...prev, research: 'running' }));
      updateAnim('research', { thought: `🔍 Qualification lot ${stageIdx+1}/${batches.length}...` });
      setFeedItems(p => [{ time: now(), from: 'Sarah', to: 'Système', msg: `🔍 Qualification de ${batch.length} contacts (lot ${stageIdx+1})`, color: '#B45309' }, ...p.slice(0, 7)]);

      setTimeout(() => {
        setStatuses(prev => ({ ...prev, research: 'success' }));
        updateAnim('research', { thought: `✅ ${batch.length} contacts qualifiés !` });
        setTimeout(() => updateAnim('research', { thought: null }), 1500);

        // Stage 2: Farida (Contact) sends messages
        setStatuses(prev => ({ ...prev, contact: 'running' }));
        updateAnim('contact', { thought: `💬 Contact lot ${stageIdx+1}...` });
        setFeedItems(p => [{ time: now(), from: 'Farida', to: 'Sarah', msg: `📨 Envoi WhatsApp à ${batch.length} contacts`, color: '#16A34A' }, ...p.slice(0, 7)]);

        setTimeout(() => {
          const consented = Math.floor(batch.length * (0.5 + Math.random() * 0.3));
          setStatuses(prev => ({ ...prev, contact: 'success' }));
          updateAnim('contact', { thought: `✅ ${consented}/${batch.length} consentements !` });
          setTimeout(() => updateAnim('contact', { thought: null }), 1500);
          setKpis(p => ({ ...p, leads: p.leads + consented }));
          setFeedItems(p => [{ time: now(), from: 'Farida', to: 'Kwelly', msg: `📊 ${consented} consentements obtenus sur lot ${stageIdx+1}`, color: '#16A34A', urgent: true }, ...p.slice(0, 7)]);

          // Stage 3: Fatou (Onboarding)
          setTimeout(() => {
            setStatuses(prev => ({ ...prev, onboarding: 'running' }));
            updateAnim('onboarding', { thought: `📋 Onboarding ${batch.length} vendeurs...` });
            setFeedItems(p => [{ time: now(), from: 'Fatou', to: 'Farida', msg: `📋 Questionnaire envoyé aux ${consented} consentements`, color: '#EA580C' }, ...p.slice(0, 7)]);

            setTimeout(() => {
              setStatuses(prev => ({ ...prev, onboarding: 'success' }));
              updateAnim('onboarding', { thought: '✅ Données collectées !' });
              setTimeout(() => updateAnim('onboarding', { thought: null }), 1500);

              // Stage 4: Paul (Supervisor) checks quality
              setTimeout(() => {
                setStatuses(prev => ({ ...prev, supervisor: 'running' }));
                updateAnim('supervisor', { thought: '✅ Vérification qualité...' });
                setFeedItems(p => [{ time: now(), from: 'Paul', to: 'Fatou', msg: `🛡️ Validation qualité lot ${stageIdx+1}`, color: '#E91E90' }, ...p.slice(0, 7)]);

                setTimeout(() => {
                  setStatuses(prev => ({ ...prev, supervisor: 'success' }));
                  updateAnim('supervisor', { thought: '✅ Qualité OK !' });
                  setTimeout(() => updateAnim('supervisor', { thought: null }), 1500);

                  // Stage 5: Koffi (Account creation)
                  setTimeout(() => {
                    setStatuses(prev => ({ ...prev, account_creation: 'running' }));
                    updateAnim('account_creation', { thought: `🔑 Création ${batch.length} comptes...` });
                    setFeedItems(p => [{ time: now(), from: 'Koffi', to: 'Paul', msg: `🔑 Création comptes pour ${batch.length} vendeurs`, color: '#7C3AED' }, ...p.slice(0, 7)]);

                    setTimeout(() => {
                      setStatuses(prev => ({ ...prev, account_creation: 'success' }));
                      updateAnim('account_creation', { thought: '✅ Comptes créés !' });
                      setTimeout(() => updateAnim('account_creation', { thought: null }), 1500);
                      setKpis(p => ({ ...p, shops: p.shops + batch.length }));

                      // Stage 6: Awa (Product publishing)
                      setTimeout(() => {
                        setStatuses(prev => ({ ...prev, product_publishing: 'running' }));
                        updateAnim('product_publishing', { thought: '📦 Publication produits...' });
                        setFeedItems(p => [{ time: now(), from: 'Awa', to: 'Koffi', msg: `📦 Publication catalogue pour ${batch.length} boutiques`, color: '#A855F7' }, ...p.slice(0, 7)]);

                        setTimeout(() => {
                          setStatuses(prev => ({ ...prev, product_publishing: 'success' }));
                          updateAnim('product_publishing', { thought: '✅ Produits publiés !' });
                          setTimeout(() => updateAnim('product_publishing', { thought: null }), 1500);

                          // Stage 7: Oceane (WhatsApp followup)
                          setTimeout(() => {
                            setStatuses(prev => ({ ...prev, whatsapp_followup: 'running' }));
                            updateAnim('whatsapp_followup', { thought: '📱 Validation finale...' });
                            setFeedItems(p => [{ time: now(), from: 'Oceane', to: 'Awa', msg: `📱 Envoi lien boutique aux ${batch.length} vendeurs`, color: '#059669' }, ...p.slice(0, 7)]);

                            setTimeout(() => {
                              const validated = Math.floor(batch.length * (0.7 + Math.random() * 0.2));
                              setStatuses(prev => ({ ...prev, whatsapp_followup: 'success' }));
                              updateAnim('whatsapp_followup', { thought: `✅ ${validated}/${batch.length} validés !` });
                              setTimeout(() => updateAnim('whatsapp_followup', { thought: null }), 1500);

                              // Stage 8: Eve (Marketing) optimizes
                              setTimeout(() => {
                                setStatuses(prev => ({ ...prev, marketing: 'running' }));
                                updateAnim('marketing', { thought: '📊 Optimisation campagne...' });
                                setFeedItems(p => [{ time: now(), from: 'Eve', to: 'Oceane', msg: `📊 Analyse conversion lot ${stageIdx+1}`, color: '#CA8A04' }, ...p.slice(0, 7)]);

                                setTimeout(() => {
                                  setStatuses(prev => ({ ...prev, marketing: 'success' }));
                                  const convRate = Math.round((4 + Math.random() * 6) * 10) / 10;
                                  setKpis(p => ({ ...p, conv: convRate }));
                                  updateAnim('marketing', { thought: `📈 Taux: ${convRate}% !` });
                                  setTimeout(() => updateAnim('marketing', { thought: null }), 1500);
                                  setFeedItems(p => [{ time: now(), from: 'Eve', to: 'Kwelly', msg: `📊 Lot ${stageIdx+1} terminé — taux conversion ${convRate}%`, color: '#CA8A04' }, ...p.slice(0, 7)]);

                                  // Move to next batch
                                  setTimeout(() => runStage(stageIdx + 1), 800);
                                }, 1800);
                              }, 600);
                            }, 2000);
                          }, 600);
                        }, 2000);
                      }, 600);
                    }, 2000);
                  }, 600);
                }, 2000);
              }, 600);
            }, 2500);
          }, 600);
        }, 3000);
      }, 2500);
    };

    // Start pipeline
    setFeedItems(p => [{ time: now(), from: 'Kwelly', to: 'Tous', msg: `🚀 Pipeline lancé — ${batches.length} lots à traiter`, color: '#3B82F6', urgent: true }, ...p.slice(0, 7)]);
    setStatuses(prev => ({ ...prev, orchestrator: 'running' }));
    updateAnim('orchestrator', { thought: `🚀 Pipeline: ${total} contacts en ${batches.length} lots` });
    setTimeout(() => updateAnim('orchestrator', { thought: null }), 2000);
    writeLog({ action: 'pipeline_start', severity: 'info', agent_key: 'orchestrator', details: { total_contacts: total, batches: batches.length } });
    runStage(0);
  }, [updateAnim]);

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/import-contacts', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        writeLog({ action: 'import_contacts', severity: 'info', details: { total: data.total, filename: data.filename } });
        setImportedContacts(prev => [...data.contacts, ...prev]);
        setImportMsg({ type: 'success', text: `${data.total} contact(s) importé(s) depuis ${data.filename}` });
        setModeSecondaire(false);
        modeSecondaireRef.current = false;
        setStatuses(STATUSES_INIT);
        processAgentPipeline(data.contacts);
      } else {
        writeLog({ action: 'import_error', severity: 'error', details: { error: data.error } });
        setImportMsg({ type: 'error', text: data.error || 'Erreur lors de l\'import' });
      }
    } catch (err) {
      writeLog({ action: 'import_network_error', severity: 'error', details: { error: err?.message } });
      setImportMsg({ type: 'error', text: 'Erreur réseau lors de l\'import' });
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleProvideConfig = (agentKey, field) => {
    setConfigModal({ agentKey, field });
  };

  const handleConfigSubmit = (agentKey, field, value) => {
    if (!value) return;
    setAgentReqs(prev => {
      const cur = { ...prev[agentKey] };
      if (field === 'db') cur.db = true;
      else if (field === 'api') cur.api = true;
      else if (field === 'tools') cur.tools = true;
      return { ...prev, [agentKey]: cur };
    });
    const saved = localStorage.getItem('odacontrol_settings');
    const all = saved ? JSON.parse(saved) : {};
    all[`agentcfg_${agentKey}_${field}`] = value;
    localStorage.setItem('odacontrol_settings', JSON.stringify(all));
    const agent = AGENTS.find(a => a.key === agentKey);
    if (agent) {
      updateAnim(agentKey, { thought: `✅ ${field === 'api' ? 'API' : field === 'db' ? 'Base de données' : 'Outils'} configuré ! Merci !` });
      setTimeout(() => updateAnim(agentKey, { thought: null }), 2500);
      setFeedItems(p => [{ time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
        from: 'Système', to: agent.name, msg: `✅ ${agent.name} a reçu: ${field === 'api' ? 'API' : field === 'db' ? 'Base de données' : 'Outils'}`, color: '#10B981' }, ...p.slice(0, 7)]);
    }
    setConfigModal(null);
  };

  useEffect(() => {
    const fromStorage = loadAgentConfigsFromSettings();
    if (Object.keys(fromStorage).length) setAgentReqs(fromStorage);
  }, []);

  useEffect(() => {
    const initAnims = {};
    AGENTS.forEach(a => { initAnims[a.key] = { lookDir: 0, blink: false, tilt: 0, thought: null, comm: null }; });
    setAnims(initAnims);

    intervalRef.current = setInterval(() => {
      if (modeSecondaireRef.current) return;
      tickRef.current += 1;
      setAnims(prev => {
        const next = { ...prev };
        AGENTS.forEach(a => {
          if (disabled[a.key]) return;
          if (isSleeping(a.key)) {
            const st = next[a.key] || {};
            if (st.waking) return;
            if (Math.random() < .08) {
              const missing = getMissingReqs(a.key);
              if (missing.length) {
                const m = missing[Math.floor(Math.random() * missing.length)];
                next[a.key] = { ...st, thought: `💤 Il me faut: ${m.label}` };
                setTimeout(() => updateAnim(a.key, { thought: null }), 3000);
              }
            }
            return;
          }
          const st = next[a.key] || {};
          if (st.waking) return;
          const r = Math.random();
          if (!aiRef.current && a.key === 'orchestrator' && r < .35) {
            const msgs = ['⚠️ IA injoignable...', '🔌 IA déconnectée !', '😤 Qui a coupé l\'IA ?', '⛔ Pas d\'IA disponible', '🔄 Tentative reconnexion IA...'];
            next[a.key] = { ...st, thought: msgs[Math.floor(Math.random() * msgs.length)] };
            setTimeout(() => updateAnim(a.key, { thought: null }), 2500);
          } else if (!aiRef.current && r < .2) {
            next[a.key] = { ...st, thought: '🔌 Connexion IA perdue...' };
            setTimeout(() => updateAnim(a.key, { thought: null }), 2000);
          } else if (r < .04) {
            next[a.key] = { ...st, blink: true };
            setTimeout(() => updateAnim(a.key, { blink: false }), 100);
          } else if (r < .10) {
            next[a.key] = { ...st, lookDir: r < .07 ? -1 : 1 };
            setTimeout(() => updateAnim(a.key, { lookDir: 0 }), 400 + Math.random() * 300);
          } else if (r < .16) {
            next[a.key] = { ...st, tilt: (Math.random() - .5) * 8 };
            setTimeout(() => updateAnim(a.key, { tilt: 0 }), 500 + Math.random() * 300);
          } else if (r < .24) {
            const thought = a.thoughts[Math.floor(Math.random() * a.thoughts.length)];
            next[a.key] = { ...st, thought };
            setTimeout(() => updateAnim(a.key, { thought: null }), 2000 + Math.random() * 1000);
          } else if (r < .28) {
            if (Math.random() < .35) {
              const probs = ['Données manquantes...', 'Connexion instable...', 'En attente de réponse...', 'Traitement lent...', 'Réessai en cours...'];
              next[a.key] = { ...st, thought: probs[Math.floor(Math.random() * probs.length)] };
              setTimeout(() => updateAnim(a.key, { thought: null }), 2000);
            } else if (Math.random() < .5) {
              next[a.key] = { ...st, thought: '⚠️ Problème détecté', blink: true };
              setTimeout(() => { updateAnim(a.key, { thought: null, blink: false }); }, 1500);
            } else {
              next[a.key] = { ...st, lookDir: 0, tilt: 0, thought: '...' };
              setTimeout(() => updateAnim(a.key, { thought: null }), 1200 + Math.random() * 500);
            }
          }
        });
        return next;
      });
    }, 1000);

    commIntervalRef.current = setInterval(() => {
      if (modeSecondaireRef.current) return;
      setFeedItems(prev => {
        const senderIdx = Math.floor(Math.random()*AGENTS.length);
        let sender = AGENTS[senderIdx];
        if (disabled[sender.key]) {
          const alt = AGENTS.find(a => !disabled[a.key] && !isSleeping(a.key));
          if (!alt) return prev;
          sender = alt;
        }
        const cd = sender.comms[Math.floor(Math.random()*sender.comms.length)];
        const recv = AGENTS.find(x => x.key === cd.to);
        if (!recv) return prev;
        const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        if (disabled[recv.key]) {
          updateAnim(sender.key, { thought: `⚠️ ${recv.name} est désactivé... ${cd.msg}` });
          setTimeout(() => updateAnim(sender.key, { thought: null }), 3000);
          setWaitingAgents(prev => {
            const count = (prev[recv.key] || 0) + 1;
            if (count >= 3) {
              setTimeout(() => {
                updateAnim(recv.key, { thought: '🤔 On m\'appelle... urgent !', blink: true });
                setTimeout(() => {
                  setDisabled(d => ({ ...d, [recv.key]: false }));
                  updateAnim(recv.key, { thought: 'Me voilà ! Désolé du retard...', blink: false });
                  setTimeout(() => updateAnim(recv.key, { thought: null }), 2500);
                  setFeedItems(p => [{ time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
                    from: recv.name, to: sender.name, msg: 'Réveillé en urgence ! Je suis là !', color: '#f59e0b', urgent: true }, ...p.slice(0, 7)]);
                }, 2000);
              }, 500);
            }
            return { ...prev, [recv.key]: count };
          });
          return [
            { time: now, from: sender.name, to: recv.name, msg: `🔴 ${recv.name} est indisponible ! ${cd.msg}`, color: '#ef4444', urgent: true },
            ...prev.slice(0, 7)
          ];
        }

        if (isSleeping(recv.key)) {
          const missing = getMissingReqs(recv.key);
          const need = missing.length ? missing[0].label : 'configuration';
          updateAnim(sender.key, { thought: `⏳ ${recv.name} dort ( besoin: ${need})` });
          setTimeout(() => updateAnim(sender.key, { thought: null }), 3000);
          return [
            { time: now, from: sender.name, to: recv.name, msg: `💤 ${recv.name} endormi (attend: ${need})`, color: '#6B7280' },
            ...prev.slice(0, 7)
          ];
        }

        updateAnim(sender.key, { comm: cd.msg });
        setTimeout(() => {
          if (Math.random() < .20 && (sender.key === 'orchestrator' || sender.key === 'supervisor')) {
            const mistakes = [
              `⚠️ ERREUR ${recv.name} ! Tu as mal fait le travail !`,
              `❌ ${recv.name}, ce n'est pas correct ! Recommence !`,
              `🔴 ${recv.name} ! Qualité insuffisante, corrige ça !`,
              `😤 ${recv.name} ! Ce n'est pas ce que j'ai demandé !`,
            ];
            const angryMsg = mistakes[Math.floor(Math.random()*mistakes.length)];
            updateAnim(sender.key, { thought: angryMsg });
            updateAnim(recv.key, { thought: '😰 Désolé... je corrige...', blink: true });
            setTimeout(() => {
              updateAnim(sender.key, { comm: null, thought: null });
              updateAnim(recv.key, { thought: '✅ Corrigé !', blink: false });
              setTimeout(() => updateAnim(recv.key, { thought: null }), 2000);
              setFeedItems(p => [{ time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
                from: sender.name, to: recv.name, msg: angryMsg, color: '#ef4444', urgent: true }, ...p.slice(0, 7)]);
            }, 2500);
          } else {
            updateAnim(recv.key, { thought: '...' });
            setTimeout(() => { updateAnim(sender.key, { comm: null }); updateAnim(recv.key, { thought: null }); }, 2800);
          }
        }, 360);
        return [{ time: now, from: sender.name, to: recv.name, msg: cd.msg, color: sender.color }, ...prev.slice(0, 7)];
      });
    }, 3000);

    const kpiInterval = setInterval(() => {
      if (modeSecondaireRef.current) return;
      setKpis(p => ({ leads: p.leads+(Math.random()<.25?1:0), shops: p.shops+(Math.random()<.06?1:0), conv: Math.round((p.conv+(Math.random()-.5)*.3)*10)/10 }));
      setStatuses(prev => {
        const keys = Object.keys(prev), k = keys[Math.floor(Math.random()*keys.length)];
        if (k === 'orchestrator') return prev;
        const cycle = { running: 'success', success: 'idle', idle: 'running', waiting: 'running', failed: 'idle' };
        return { ...prev, [k]: cycle[prev[k]] || 'idle' };
      });
    }, 2800);
    return () => { clearInterval(intervalRef.current); clearInterval(commIntervalRef.current); clearInterval(kpiInterval); };
  }, [updateAnim, disabled, isSleeping, getMissingReqs]);

  const selectAgent = (key) => {
    if (selected === key) { setSelected(null); return; }
    setSelected(key);
    const agent = AGENTS.find(a => a.key === key);
    if (!agent) return;
    if (isSleeping(key)) {
      updateAnim(key, { thought: `💤 Je dors... il me faut des ressources pour travailler. Configure-moi !` });
      setTimeout(() => updateAnim(key, { thought: null }), 4000);
      return;
    }
    const animClass = agent.wakeAnim || 'fadeScaleUp';
    updateAnim(key, { waking: true, thought: agent.greeting, blink: false });
    setTimeout(() => { updateAnim(key, { waking: false, thought: null }); }, 5000);
  };

  const selAgent = selected ? AGENTS.find(a => a.key === selected) : null;
  const sleepingCount = AGENTS.filter(a => isSleeping(a.key)).length;
  const activeCount = AGENTS.filter(a => !disabled[a.key] && !isSleeping(a.key)).length;

  return (
    <div>
      <style>{`
        @keyframes f0 { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-3px); } }
        @keyframes f1 { 0%,100% { transform: translateY(-1.5px); } 50% { transform: translateY(1.5px); } }
        @keyframes f2 { 0%,100% { transform: translateY(1px); } 50% { transform: translateY(-2.5px); } }
        @keyframes fadeScaleUp { from { opacity: 0; transform: scale(.7); } 50% { transform: scale(1.05); } to { opacity: 1; transform: scale(1); } }
        @keyframes rotateIn { from { opacity: 0; transform: rotate(-15deg) scale(.6); } 60% { transform: rotate(3deg) scale(1.05); } to { opacity: 1; transform: rotate(0deg) scale(1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } 70% { transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounceIn { from { opacity: 0; transform: scale(.3); } 50% { transform: scale(1.15); } 70% { transform: scale(.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes stretchIn { from { opacity: 0; transform: scaleX(.3) scaleY(.8); } 60% { transform: scaleX(1.05) scaleY(1.02); } to { opacity: 1; transform: scaleX(1) scaleY(1); } }
        @keyframes popIn { from { opacity: 0; transform: scale(.5); } to { opacity: 1; transform: scale(1); } }
        @keyframes expandIn { from { opacity: 0; clip-path: circle(0% at 50% 50%); } to { opacity: 1; clip-path: circle(100% at 50% 50%); } }
        @keyframes gentleRise { from { opacity: 0; transform: translateY(15px); filter: blur(4px); } 60% { filter: blur(0); } to { opacity: 1; transform: translateY(0); } }
        @keyframes flipIn { from { opacity: 0; transform: perspective(400px) rotateX(-90deg); } 60% { transform: perspective(400px) rotateX(10deg); } to { opacity: 1; transform: perspective(400px) rotateX(0deg); } }
        @keyframes spinDash { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -36; } }
        @keyframes dotBounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-4px); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(.8); } to { opacity: 1; transform: scale(1); } }
        .agent-card { cursor: pointer; transition: all .3s cubic-bezier(.4,0,.2,1); }
        .agent-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px -8px rgba(0,0,0,.12); }
        .agent-card.selected { transform: translateY(-2px); }
        .agent-card.sleeping { filter: grayscale(.4); }
        .detail-panel { animation: slideUp .35s ease; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d0d0d0; border-radius: 4px; }
        .drop-zone { border: 2px dashed #d0d0d0; border-radius: 16px; padding: 32px; text-align: center; transition: all .3s; cursor: pointer; }
        .drop-zone:hover { border-color: #8B5CF6; background: #8B5CF605; }
      `}</style>

      <div style={{ display: 'flex', gap: 16, minHeight: 'calc(100vh - 110px)' }}>
        {/* Left: Agent Grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '.5px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SvgIcon name="agents" size={18} color="#1a1a1a"/>
                  ODAControl · Agents
                </h2>
                <p style={{ fontSize: 11, color: '#999', margin: '2px 0 0' }}>
                  Kwelly 2.0 · Douala, CM · {activeCount} actifs
                  {sleepingCount > 0 && <span style={{ color: '#6B7280' }}> · {sleepingCount} endormis</span>}
                  {importedContacts.length > 0 && <span style={{ color: '#8B5CF6' }}> · 📂 {importedContacts.length} contacts (Mode Secondaire)</span>}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600,
                  background: aiConnected ? '#22C55E10' : '#EF444410',
                  color: aiConnected ? '#16A34A' : '#EF4444' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: aiConnected ? '#22C55E' : '#EF4444', display: 'inline-block',
                    animation: aiConnected ? 'pulse 1.4s infinite' : 'none' }}/>
                  IA {aiConnected ? 'Connectée' : 'Déconnectée'}
                </div>
                {[{ label: 'Leads', value: kpis.leads, color: '#3B82F6' }, { label: 'Boutiques', value: kpis.shops, color: '#16A34A' }, { label: 'Conv.', value: kpis.conv+'%', color: '#D97706' }].map(k => (
                  <div key={k.label} style={{ background: '#f8f9fa', borderRadius: 10, padding: '6px 14px', textAlign: 'center', border: '.5px solid #e5e7eb' }}>
                    <div style={{ fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: '.05em' }}>{k.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'monospace', color: k.color }}>{k.value}</div>
                  </div>
                ))}
                <div style={{ width: 1, height: 30, background: '#e5e7eb', margin: '0 4px' }}/>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { label: '💤 Tout endormir', mode: 'idle', color: '#6B7280', bg: '#f3f4f6', activeBg: '#6B7280', action: handleSleepAll },
                    { label: '🎮 Simulation', mode: 'simulation', color: '#D97706', bg: '#FFFBEB', activeBg: '#F59E0B', action: handleSimulateAll },
                    { label: '🚀 Travail Réel', mode: 'work', color: '#16A34A', bg: '#F0FDF4', activeBg: '#22C55E', action: handleWorkAll },
                  ].map(btn => (
                    <button key={btn.mode} onClick={btn.action}
                      style={{
                        padding: '6px 12px', border: 'none', borderRadius: 8, cursor: 'pointer',
                        fontWeight: 600, fontSize: 10, fontFamily: 'inherit', whiteSpace: 'nowrap',
                        background: agentMode === btn.mode ? btn.activeBg : btn.bg,
                        color: agentMode === btn.mode ? 'white' : btn.color,
                        transition: 'all .2s',
                      }}>
                      {btn.label}
                    </button>
                  ))}
                </div>
                {isAdmin && (<button onClick={() => {
                  if (!modeSecondaire) {
                    setModeSecondaire(true);
                    modeSecondaireRef.current = true;
                    setShowImport(true);
                    setStatuses(prev => {
                      const next = {};
                      Object.keys(prev).forEach(k => { next[k] = 'idle'; });
                      return next;
                    });
                    setFeedItems(p => [{ time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
                      from: 'Système', to: 'Tous', msg: '📋 Mode Secondaire — Agents en attente du fichier contacts', color: '#8B5CF6', urgent: true }, ...p.slice(0, 7)]);
                    AGENTS.forEach(a => updateAnim(a.key, { thought: '⏸️ Terminé, j\'attends le fichier...' }));
                    setTimeout(() => AGENTS.forEach(a => updateAnim(a.key, { thought: null })), 2500);
                  } else {
                    setModeSecondaire(false);
                    modeSecondaireRef.current = false;
                    setShowImport(false);
                    setStatuses(STATUSES_INIT);
                    setFeedItems(p => [{ time: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
                      from: 'Système', to: 'Tous', msg: '🟢 Mode Normal — Agents réactivés', color: '#22C55E' }, ...p.slice(0, 7)]);
                  }
                }} title="Mode Secondaire - Importer des contacts"
                  style={{ padding: '8px 14px', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 11, fontFamily: 'inherit',
                    background: modeSecondaire ? '#8B5CF6' : '#f3f0ff', color: modeSecondaire ? 'white' : '#8B5CF6', display: 'flex', alignItems: 'center', gap: 5, transition: 'all .2s' }}>
                  <span>📂</span>
                  {modeSecondaire ? 'Mode Secondaire · Actif' : 'Mode Secondaire'}
                </button>)}
              </div>
            </div>
          </div>

          {/* Mode Secondaire Panel */}
          {showImport && (
            <div style={{ background: '#fff', borderRadius: 12, padding: '10px 14px', marginBottom: 10, border: '.5px solid #e5e7eb', animation: 'slideDown .2s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div className="drop-zone" onClick={() => fileInputRef.current?.click()} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, border: '1.5px dashed #d0d0d0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', transition: 'all .2s' }}>
                  <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.docx,.pdf" onChange={handleFileImport} style={{ display: 'none' }}/>
                  {importing ? (
                    <span style={{ fontSize: 11, color: '#666' }}>⏳ Import en cours...</span>
                  ) : (
                    <>
                      <SvgIcon name="download" size={14} color="#8B5CF6"/>
                      <span style={{ fontSize: 11, color: importedContacts.length ? '#666' : '#999' }}>
                        {importedContacts.length > 0
                          ? `${importedContacts.length} contacts · Ajouter`
                          : 'Importer des contacts (CSV, XLSX, DOCX, PDF)'}
                      </span>
                    </>
                  )}
                </div>
                <button onClick={() => { setModeSecondaire(false); modeSecondaireRef.current = false; setShowImport(false); setStatuses(STATUSES_INIT); }} style={{ width: 24, height: 24, border: 'none', borderRadius: 6, background: '#f0f0f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 11, flexShrink: 0 }}>✕</button>
              </div>

              {importMsg && (
                <div style={{ marginBottom: 6, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 500,
                  background: importMsg.type === 'success' ? '#22C55E10' : '#EF444410',
                  color: importMsg.type === 'success' ? '#16A34A' : '#EF4444' }}>
                  {importMsg.text}
                </div>
              )}

              {importedContacts.length > 0 && (
                <div style={{ maxHeight: 130, overflowY: 'auto' }}>
                  {importedContacts.slice(0, 10).map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, padding: '3px 6px', borderBottom: '.5px solid #f5f5f5', fontSize: 10, alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#555', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.full_name || 'Sans nom'}
                      </span>
                      {c.phone && <span style={{ color: '#888', fontFamily: 'monospace', fontSize: 9 }}>{c.phone}</span>}
                    </div>
                  ))}
                  {importedContacts.length > 10 && (
                    <div style={{ fontSize: 9, color: '#bbb', textAlign: 'center', padding: '4px 0' }}>
                      +{importedContacts.length - 10} autres
                    </div>
                  )}
                  <div style={{ textAlign: 'right', marginTop: 2 }}>
                    {isAdmin && (<button onClick={() => setImportedContacts([])} style={{ border: 'none', background: 'none', color: '#ccc', cursor: 'pointer', fontSize: 9, fontWeight: 500 }}>Tout effacer</button>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ollama Disconnected Banner */}
          {!aiConnected && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12, padding: '10px 14px', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 10, animation: 'slideDown .3s ease' }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626' }}>IA déconnectée (OpenRouter)</div>
                <div style={{ fontSize: 10, color: '#B91C1C', marginTop: 1 }}>Les agents ne peuvent pas utiliser l'IA. Vérifiez la clé OPENROUTER_API_KEY dans .env.local.</div>
              </div>
            </div>
          )}

          {/* Agent Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {AGENTS.map(a => {
              const sc = ST[statuses[a.key]] || ST.idle;
              const isDis = disabled[a.key];
              const isSel = selected === a.key;
              const anim = anims[a.key] || {};
              const sleep = isSleeping(a.key);
              const displayStatus = isDis ? ST.inactive : (sleep ? ST.sleeping : sc);
              const missing = getMissingReqs(a.key);
              return (
                <div key={a.key} onClick={() => selectAgent(a.key)}
                  className={`agent-card${isSel?' selected':''}${sleep?' sleeping':''}`}
                  style={{
                    background: '#fff', border: `.5px solid ${isSel ? a.color+'60' : sleep ? '#6B728030' : '#e5e7eb'}`,
                    borderRadius: 16, padding: '16px 10px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center',
                    boxShadow: isSel ? `0 8px 32px -8px ${a.color}40` : '0 1px 4px rgba(0,0,0,.04)',
                    opacity: isDis ? .55 : 1, position: 'relative',
                  }}>
                  {isSel && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: a.color, borderRadius: '16px 16px 0 0' }}/>}
                  {sleep && !isSel && (
                    <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 14, opacity: .5 }}>💤</div>
                  )}
                  <AgentHead agent={a} status={statuses[a.key]} blink={anim.blink||isDis} lookDir={isDis?0:anim.lookDir} tilt={isDis?0:anim.tilt}
                    thought={isDis?null:(anim.comm?`↗ ${anim.comm}`:anim.thought)} comm={anim.comm} isDisabled={isDis} isSleeping={sleep}
                    wakeAnim={anim.waking ? a.wakeAnim : undefined}/>
                  <div style={{ fontSize: 12, fontWeight: 600, textAlign: 'center', color: isDis ? '#bbb' : (sleep ? '#9CA3AF' : '#1a1a1a'), marginTop: 2 }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: isDis ? '#ccc' : (sleep ? '#B0B0B0' : '#999'), textAlign: 'center' }}>{a.role}</div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 9, color: isDis ? '#ddd' : (sleep ? '#ccc' : '#b0b0b0'), fontFamily: 'monospace' }}>
                    <span>💻 {isDis || sleep ? '-' : a.cpu}%</span>
                    <span>🫙 {isDis || sleep ? '-' : a.ram}MB</span>
                  </div>
                  {sleep && missing.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6, width: '100%' }}>
                      {isAdmin && missing.map((m, i) => (
                        <div key={i} onClick={(e) => { e.stopPropagation(); handleProvideConfig(a.key, m.type); }}
                          style={{ fontSize: 9, padding: '3px 8px', borderRadius: 20, background: '#6B728010', color: '#6B7280', cursor: 'pointer',
                            textAlign: 'center', border: '.5px dashed #6B728040', fontWeight: 500 }}>
                          🔧 {m.label.length > 25 ? m.label.slice(0, 25)+'...' : m.label}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, padding: '2px 8px', borderRadius: 20, marginTop: 6,
                      background: displayStatus.col+'18', color: displayStatus.col, fontWeight: 600 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: displayStatus.col, flexShrink: 0, animation: displayStatus.pulse?'pulse 1.3s infinite':'none' }}/>
                      {displayStatus.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Feed */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', marginTop: 14, border: '.5px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#999', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block', animation: 'pulse 1.4s infinite' }}/>
              Messagerie inter-agents
            </div>
            <div style={{ maxHeight: 140, overflowY: 'auto' }}>
              {feedItems.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '4px 0', borderBottom: i<feedItems.length-1?'.5px solid #f0f0f0':'none' }}>
                  {f.urgent && <span style={{ fontSize: 9, flexShrink: 0 }}>🔴</span>}
                  <span style={{ color: '#b0b0b0', fontFamily: 'monospace', fontSize: 9, flexShrink: 0, marginTop: 2 }}>{f.time}</span>
                  <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap', background: f.color+'1a', color: f.color }}>{f.from}</span>
                  <span style={{ fontSize: 9, color: '#ccc', flexShrink: 0 }}>→</span>
                  <span style={{ fontSize: 10, color: f.urgent ? '#ef4444' : '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: f.urgent ? 600 : 400 }}>{f.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div style={{ width: 320, flexShrink: 0 }}>
          {selAgent ? (
            <div className="detail-panel" style={{
              background: 'linear-gradient(145deg, #fff, #f8f9fa)', borderRadius: 20, padding: 24, border: `.5px solid ${selAgent.color}30`,
              boxShadow: `0 8px 32px ${selAgent.color}15`, position: 'sticky', top: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                <div style={{ width: 64, height: 76, flexShrink: 0 }}>
                  <svg width="64" height="76" viewBox="0 0 64 76" overflow="visible">
                    <defs>
                      <radialGradient id={`gd-${selAgent.key}`} cx="32%" cy="26%" r="70%">
                        <stop offset="0%" stopColor={lk(selAgent.color,55)}/><stop offset="30%" stopColor={selAgent.color}/>
                        <stop offset="72%" stopColor={dk(selAgent.color,38)}/><stop offset="100%" stopColor={dk(selAgent.color,80)}/>
                      </radialGradient>
                      <radialGradient id={`sd-${selAgent.key}`} cx="28%" cy="22%" r="32%">
                        <stop offset="0%" stopColor="#fff" stopOpacity=".22"/><stop offset="100%" stopColor="#fff" stopOpacity="0"/>
                      </radialGradient>
                      <radialGradient id={`rd-${selAgent.key}`} cx="82%" cy="55%" r="36%">
                        <stop offset="0%" stopColor="#000" stopOpacity=".28"/><stop offset="100%" stopColor="#000" stopOpacity="0"/>
                      </radialGradient>
                    </defs>
                    <ellipse cx="32" cy="39" rx="29.44" ry="28.16" fill={`url(#gd-${selAgent.key})`}/>
                    <ellipse cx="32" cy="39" rx="29.44" ry="28.16" fill={`url(#sd-${selAgent.key})`}/>
                    <ellipse cx="32" cy="39" rx="29.44" ry="28.16" fill={`url(#rd-${selAgent.key})`}/>
                    <ellipse cx="32" cy="39" rx="23.55" ry="12.1" fill="#000" fillOpacity=".10"/>
                    <ellipse cx="19.6" cy="34.82" rx="5.25" ry="5.25" fill="#0d0d14"/>
                    <ellipse cx="44.4" cy="34.82" rx="5.25" ry="5.25" fill="#0d0d14"/>
                    <circle cx="18.3" cy="33.18" r="1.47" fill="#fff" opacity=".65"/>
                    <circle cx="43.1" cy="33.18" r="1.47" fill="#fff" opacity=".65"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>{selAgent.name}</div>
                      <div style={{ fontSize: 12, color: selAgent.color, fontWeight: 600 }}>{selAgent.role}</div>
                    </div>
                    <button onClick={() => setSelected(null)} style={{ width: 28, height: 28, border: 'none', borderRadius: 8, background: '#f0f0f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 14 }}>✕</button>
                  </div>
                  <p style={{ fontSize: 12, color: '#666', lineHeight: 1.6, margin: '6px 0 0' }}>{selAgent.desc}</p>
                </div>
              </div>

              {/* CPU/RAM */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                {[{ label: 'CPU', value: disabled[selAgent.key] ? '-' : (isSleeping(selAgent.key) ? '-' : selAgent.cpu+'%'), color: selAgent.cpu > 25 ? '#ef4444' : selAgent.cpu > 10 ? '#f59e0b' : '#10b981' },
                  { label: 'RAM', value: disabled[selAgent.key] ? '-' : (isSleeping(selAgent.key) ? '-' : selAgent.ram+' MB'), color: '#3B82F6' },
                  { label: 'État', value: disabled[selAgent.key] ? 'Inactif' : (isSleeping(selAgent.key) ? 'Endormi' : (ST[statuses[selAgent.key]]?.label || 'Inconnu')), color: disabled[selAgent.key] ? '#6B7280' : (isSleeping(selAgent.key) ? '#6B7280' : (ST[statuses[selAgent.key]]?.col || '#999')) }
                ].map(m => (
                  <div key={m.label} style={{ flex: 1, background: '#f8f9fa', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#999', marginBottom: 2 }}>{m.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Requirements / Missing tools */}
              {isSleeping(selAgent.key) && (
                <div style={{ marginBottom: 16, padding: 12, background: '#FEF3C7', borderRadius: 12, border: '1px solid #F59E0B30' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#D97706', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>💤</span> Agent endormi — ressources manquantes
                  </div>
                  {getMissingReqs(selAgent.key).map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'white', borderRadius: 8, marginBottom: 5, border: '.5px solid #F59E0B20' }}>
                      <div style={{ fontSize: 11, color: '#92400E' }}>
                        <span style={{ fontWeight: 600 }}>{m.type === 'api' ? '🔑 API' : m.type === 'db' ? '🗄️ Base de données' : '🔧 Outils'}</span>
                        <span style={{ color: '#A16207', marginLeft: 4 }}>— {m.label}</span>
                      </div>
                      {isAdmin && (<button onClick={() => handleProvideConfig(selAgent.key, m.type)}
                        style={{ padding: '4px 12px', border: 'none', borderRadius: 8, background: '#D97706', color: 'white', cursor: 'pointer', fontSize: 10, fontWeight: 600, fontFamily: 'inherit' }}>
                        Configurer
                      </button>)}
                    </div>
                  ))}
                  <p style={{ fontSize: 10, color: '#A16207', marginTop: 6 }}>Configurez les éléments manquants pour réveiller cet agent.</p>
                </div>
              )}

              {/* Tasks */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Tâches</div>
                {selAgent.tasks.map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 5, padding: '6px 10px', background: '#f8f9fa', borderRadius: 8 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: selAgent.color, flexShrink: 0, marginTop: 5 }}/>
                    <span style={{ fontSize: 11, color: '#444', lineHeight: 1.4 }}>{t}</span>
                  </div>
                ))}
              </div>

              {/* Metrics */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, padding: 12, background: selAgent.color+'08', borderRadius: 12, border: `.5px solid ${selAgent.color}20` }}>
                {[{ label: 'Runs', value: selAgent.metrics.runs }, { label: 'Succès', value: selAgent.metrics.success },
                  { label: 'Tokens', value: selAgent.metrics.tokens }, { label: 'Taux', value: Math.round(selAgent.metrics.success/selAgent.metrics.runs*100)+'%', color: selAgent.color }
                ].map(m => (
                  <div key={m.label} style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: 9, color: '#999', marginBottom: 1 }}>{m.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: m.color || '#1a1a1a' }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              {isAdmin && (<button onClick={() => {
                const isOff = disabled[selAgent.key];
                setDisabled(prev => ({ ...prev, [selAgent.key]: !isOff }));
                if (!isOff) { updateAnim(selAgent.key, { thought: '*se rendort*' }); setTimeout(() => updateAnim(selAgent.key, { thought: null }), 1500); }
                else {
                  setWaitingAgents(prev => ({ ...prev, [selAgent.key]: 0 }));
                  updateAnim(selAgent.key, { thought: 'Réveil en cours...' }); setTimeout(() => updateAnim(selAgent.key, { thought: null }), 2000);
                }
              }} style={{
                width: '100%', padding: '10px 16px', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
                background: disabled[selAgent.key] ? '#10b981' : '#ef4444', color: 'white', transition: 'all .2s',
              }} onMouseOver={e => e.currentTarget.style.opacity = '.85'} onMouseOut={e => e.currentTarget.style.opacity = '1'}>
                {disabled[selAgent.key] ? '🟢 Activer cet agent' : '⏸️ Désactiver cet agent'}
              </button>)}
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 20, padding: 32, border: '.5px solid #e5e7eb', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <SvgIcon name="agents" size={48} color="#d0d0d0"/>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#999', margin: '12px 0 4px' }}>Aucun agent sélectionné</h3>
              <p style={{ fontSize: 11, color: '#bbb' }}>Cliquez sur un agent pour voir ses détails</p>
            </div>
          )}
        </div>
      </div>

      {/* Config Modal */}
      {configModal && (() => {
        const agent = AGENTS.find(a => a.key === configModal.agentKey);
        const field = configModal.field;
        if (!agent || !agent.requires) return null;
        const r = agent.requires;
        const label = field === 'api' ? r.api : field === 'db' ? r.db : (r.tools || []).join(', ');
        return (
          <div onClick={() => setConfigModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn .2s ease' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: 28, width: 400, maxWidth: '90vw', boxShadow: '0 24px 64px rgba(0,0,0,.15)', animation: 'zoomIn .25s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
                  {field === 'api' ? '🔑 Configurer API' : field === 'db' ? '🗄️ Configurer Base de données' : '🔧 Configurer Outils'}
                </h3>
                <button onClick={() => setConfigModal(null)} style={{ width: 28, height: 28, border: 'none', borderRadius: 8, background: '#f0f0f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 14 }}>✕</button>
              </div>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: '#666', margin: '0 0 4px' }}>
                  <strong>{agent.name}</strong> a besoin de :
                </p>
                <p style={{ fontSize: 13, color: '#333', background: '#f8f9fa', padding: '10px 14px', borderRadius: 10, margin: 0 }}>{label}</p>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); handleConfigSubmit(configModal.agentKey, configModal.field, fd.get('config_value')); }}>
                <input name="config_value" placeholder={field === 'api' ? 'Entrez la clé API...' : field === 'db' ? 'Entrez l\'URL de connexion...' : 'Confirmez la disponibilité des outils...'}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  autoFocus/>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {isAdmin && (<button type="submit"
                    style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, background: '#8B5CF6', color: 'white', fontWeight: 700, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>
                    ✅ Confirmer & Réveiller
                  </button>)}
                  <button type="button" onClick={() => setConfigModal(null)}
                    style={{ padding: '10px 18px', border: '.5px solid #e5e7eb', borderRadius: 10, background: 'white', cursor: 'pointer', fontSize: 12, color: '#666', fontFamily: 'inherit' }}>
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
