'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { SvgIcon } from '../../lib/icons';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{background:#f1f3f5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#1a1a1a;font-size:13px}
.oda-shell{display:flex;flex-direction:column;min-height:100vh}
.oda-topbar{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#fff;border-bottom:0.5px solid #e5e7eb;flex-shrink:0}
.oda-logo{font-size:14px;font-weight:600;letter-spacing:0.05em;color:#1a1a1a;display:flex;align-items:center;gap:8px}
.oda-logo span{color:#007AFF}
.oda-toggle-btn{width:28px;height:28px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#999;font-size:16px;border-radius:6px;flex-shrink:0}
.oda-toggle-btn:hover{background:#f0f2f5;color:#1a1a1a}
.oda-pills{display:flex;gap:6px}
.oda-pill{font-size:11px;padding:3px 9px;border-radius:20px;border:0.5px solid #e5e7eb;color:#666;display:flex;align-items:center;gap:5px}
.oda-pill.ok{border-color:#34C759;color:#34C759}
.oda-pill.run{border-color:#007AFF;color:#007AFF}
.oda-pill.warn{border-color:#FF9500;color:#FF9500}
.oda-dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0}
.oda-dot.pulse{animation:oda-blink 1.4s ease-in-out infinite}
@keyframes oda-blink{0%,100%{opacity:1}50%{opacity:.25}}
.oda-body{display:flex;flex:1;overflow:hidden}
.oda-sidebar{width:48px;flex-shrink:0;background:#fff;border-right:0.5px solid #e5e7eb;display:flex;flex-direction:column;align-items:center;padding:8px 0;gap:2px;transition:width .2s;overflow:hidden}
.oda-sidebar.open{width:200px;align-items:stretch;padding:8px 6px}
.oda-sidebar.open .oda-nav-btn{justify-content:flex-start;padding:8px 10px;width:100%;gap:10px;font-size:13px}
.oda-sidebar.open .oda-nav-btn .icon-only{font-size:16px;width:24px;text-align:center;flex-shrink:0}
.oda-nav-btn{width:36px;height:36px;border-radius:8px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#999;font-size:16px;transition:all 0.15s;position:relative;text-decoration:none;flex-shrink:0}
.oda-nav-btn:hover{background:#f0f2f5;color:#1a1a1a}
.oda-nav-btn.active{background:#eef0ff;color:#1a1a2e}
.oda-nav-btn .badge{position:absolute;top:4px;right:4px;width:8px;height:8px;border-radius:50%;background:#FF3B30;border:1.5px solid #fff}
.oda-nav-btn .nav-label{display:none;font-size:13px;font-weight:500;color:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.oda-sidebar.open .oda-nav-btn .nav-label{display:block}
.oda-content{flex:1;background:#f1f3f5;padding:14px;overflow:auto;display:flex;flex-direction:column}
.oda-statusbar{padding:5px 14px;background:#fff;border-top:0.5px solid #e5e7eb;display:flex;align-items:center;gap:16px;font-size:10px;font-family:monospace;color:#b0b0b0;flex-shrink:0;flex-wrap:wrap}
.oda-statusbar span{display:flex;align-items:center;gap:5px}
.oda-sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
.section-title{font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.section-title .tag{font-size:10px;font-weight:400;color:#999;border:0.5px solid #e5e7eb;border-radius:20px;padding:2px 7px}
.kpi-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:14px}
.kpi{background:#fff;border:0.5px solid #e5e7eb;border-radius:8px;padding:10px 12px}
.kpi-label{font-size:11px;color:#999;margin-bottom:4px}
.kpi-val{font-family:monospace;font-size:20px;font-weight:600;color:#1a1a1a}
.kpi-delta{font-size:10px;margin-top:2px}
.kpi-delta.pos{color:#34C759}
.kpi-delta.neg{color:#FF3B30}
.agent-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.agent-card{background:#fff;border:0.5px solid #e5e7eb;border-radius:8px;padding:10px 12px}
.agent-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.agent-name{font-size:12px;font-weight:600;color:#1a1a1a}
.status-badge{font-size:10px;padding:2px 8px;border-radius:20px;font-family:monospace;display:flex;align-items:center;gap:4px}
.status-badge.running{background:#e8f0fe;color:#007AFF}
.status-badge.idle{background:#f5f5f5;color:#999}
.status-badge.waiting{background:#fff3e0;color:#FF9500}
.status-badge.success{background:#e8f5e9;color:#34C759}
.status-badge.failed{background:#fce4ec;color:#FF3B30}
.agent-action{font-size:11px;color:#999;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.progress-bar{height:3px;background:#e8e8e8;border-radius:2px;overflow:hidden}
.progress-fill{height:100%;border-radius:2px;background:#007AFF;transition:width 0.5s}
.progress-fill.green{background:#34C759}
.progress-fill.amber{background:#FF9500}
.resource-row{display:flex;gap:12px;margin-top:6px}
.res-chip{font-size:10px;color:#b0b0b0;font-family:monospace}
.pipeline-stages{display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;padding-bottom:4px}
.stage{flex-shrink:0;background:#fff;border:0.5px solid #e5e7eb;border-radius:8px;padding:10px;min-width:88px;text-align:center}
.stage-count{font-family:monospace;font-size:18px;font-weight:600;color:#1a1a1a}
.stage-label{font-size:10px;color:#999;margin-top:2px}
.stage.active-stage{border-color:#007AFF}
.stage.active-stage .stage-count{color:#007AFF}
.chat-area{background:#fff;border:0.5px solid #e5e7eb;border-radius:8px;overflow:hidden;display:flex;flex-direction:column}
.chat-header{padding:10px 14px;border-bottom:0.5px solid #e5e7eb;display:flex;align-items:center;gap:8px;justify-content:space-between}
.chat-title{font-size:12px;font-weight:600;color:#1a1a1a;display:flex;align-items:center;gap:7px}
.online-dot{width:7px;height:7px;border-radius:50%;background:#34C759;animation:oda-blink 2s ease-in-out infinite}
.chat-messages{height:220px;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px}
.msg{max-width:85%}
.msg.user{align-self:flex-end}
.msg.assistant{align-self:flex-start}
.msg-bubble{padding:8px 11px;border-radius:8px;font-size:12px;line-height:1.5}
.msg.user .msg-bubble{background:#eef0ff;color:#1a1a2e}
.msg.assistant .msg-bubble{background:#f5f5f5;color:#1a1a1a;border:0.5px solid #e5e7eb}
.msg-meta{font-size:10px;color:#b0b0b0;margin-top:3px}
.msg.user .msg-meta{text-align:right}
.chat-input-bar{padding:8px 10px;border-top:0.5px solid #e5e7eb;display:flex;gap:8px;align-items:center}
.chat-input-bar input{flex:1;font-size:12px;background:#f5f5f5;border:0.5px solid #e5e7eb;border-radius:8px;padding:7px 10px;color:#1a1a1a;outline:none;font-family:inherit}
.chat-input-bar input::placeholder{color:#b0b0b0}
.chat-input-bar button{background:#eef0ff;border:none;border-radius:8px;color:#1a1a2e;font-size:13px;padding:7px 12px;cursor:pointer;font-family:inherit;font-weight:600}
.log-console{background:#f5f5f5;border-radius:8px;font-family:monospace;font-size:11px;height:180px;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:4px}
.log-line{display:flex;gap:8px}
.log-time{color:#b0b0b0;flex-shrink:0}
.log-level{flex-shrink:0;min-width:44px}
.log-level.info{color:#007AFF}
.log-level.warn{color:#FF9500}
.log-level.err{color:#FF3B30}
.log-level.ok{color:#34C759}
.log-msg{color:#999}
.adl{display:flex;min-height:100vh}
.adsb{width:220px;background:white;border-right:1px solid #e5e7eb;display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh;z-index:100;transition:width .2s}
.adsb.collapsed{width:60px}
.adsbh{padding:14px 16px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:10px;min-height:56px}
.adsbh svg{flex-shrink:0}
.adsbh h1{font-size:1rem;font-weight:700;white-space:nowrap;overflow:hidden}
.adsb.collapsed .adsbh h1{display:none}
.adsb.collapsed .adsbnav a span{display:none}
.adsb.collapsed .adsbnav a{justify-content:center;padding:10px 0}
.adsbnav{flex:1;overflow-y:auto;padding:8px 0}
.adsbnav a{display:flex;align-items:center;gap:10px;padding:10px 16px;text-decoration:none;color:#555;font-size:.82rem;font-weight:500;transition:all .12s;border-left:3px solid transparent;white-space:nowrap}
.adsbnav a:hover{background:#f0f2f5;color:#1a1a1a}
.adsbnav a.active{background:#eef0ff;color:#1a1a2e;border-left-color:#1a1a2e;font-weight:600}
.adsbnav a .nav-icon{font-size:1.1rem;width:24px;text-align:center;flex-shrink:0}
.adsbnav .sec-label{font-size:.65rem;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.06em;padding:12px 16px 4px}
.adsbf{padding:12px 16px;border-top:1px solid #e5e7eb;display:flex;align-items:center;gap:8px}
.adsbf .usr{flex:1;overflow:hidden}
.adsbf .usr .nm{font-size:.78rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.adsbf .usr .ml{font-size:.68rem;color:#999;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.adsb.collapsed .adsbf .usr{display:none}
.admc{margin-left:220px;flex:1;min-height:100vh;transition:margin-left .2s}
.admc.expanded{margin-left:60px}
.admh{background:white;border-bottom:1px solid #e5e7eb;padding:0 24px;display:flex;align-items:center;height:56px;position:sticky;top:0;z-index:50}
.admh .toggle{background:none;border:none;font-size:1.2rem;cursor:pointer;padding:6px;border-radius:8px;color:#555;margin-right:12px;display:flex}
.admh .toggle:hover{background:#f0f2f5}
.admh .bread{font-size:.82rem;color:#8e8e93;font-weight:500}
.admh .bread strong{color:#1a1a1a;font-weight:600}
.admh .spacer{flex:1}
.admh .user-badge{display:flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:.72rem;font-weight:600}
.admh .user-badge.super_admin{background:#1a1a2e;color:white}
.admh .user-badge.admin{background:#007AFF;color:white}
.admh .user-badge.moderator{background:#FF9500;color:white}
.adcont{padding:24px;max-width:1400px}
@keyframes adspin{to{transform:rotate(360deg)}}
@keyframes fIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.adld{display:flex;align-items:center;justify-content:center;min-height:60vh;flex-direction:column;gap:12px;color:#8e8e93}
.adsp{width:28px;height:28px;border:2.5px solid #e0e0e0;border-top-color:#1a1a2e;border-radius:50%;animation:adspin .7s linear infinite}
.adg{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:24px}
.adc{background:white;border-radius:14px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,.06);border:1px solid #f0f0f0;position:relative;overflow:hidden}
.adc .adci{position:absolute;right:16px;top:16px;font-size:1.6rem;opacity:.12}
.adc .adcl{font-size:.7rem;font-weight:600;color:#8e8e93;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}
.adc .adcv{font-size:1.8rem;font-weight:800;color:#1a1a1a;line-height:1.2}
.adc .adcs{font-size:.75rem;font-weight:600;margin-top:4px;display:flex;align-items:center;gap:4px}
.adc .adcs.up{color:#34C759}
.adc .adcs.down{color:#FF3B30}
.adc.red .adcv{color:#FF3B30}
.adc .adcbar{height:4px;border-radius:2px;margin-top:12px;background:#e8e8e8;overflow:hidden}
.adc .adcbar div{height:100%;border-radius:2px;transition:width .6s ease}
.adbtn{display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:8px;border:none;font-size:.78rem;font-weight:600;cursor:pointer;transition:all .12s;font-family:inherit}
.adbtn:hover{opacity:.85}
.adbtn:active{transform:scale(.96)}
.adbtn-sm{padding:5px 10px;font-size:.7rem}
.adbtn-danger{background:#FF3B30;color:white}
.adbtn-warning{background:#FF9500;color:white}
.adbtn-success{background:#34C759;color:white}
.adbtn-primary{background:#1a1a2e;color:white}
.adbtn-ghost{background:transparent;color:#666;border:1px solid #ddd}
.adbtn-ghost:hover{background:#f5f5f5;opacity:1}
.adpill{display:inline-flex;padding:2px 10px;border-radius:12px;font-size:.68rem;font-weight:600}
.adpill.actif{background:#e8f5e9;color:#2e7d32}
.adpill.inactif{background:#f5f5f5;color:#666}
.adpill.en_attente{background:#fff3e0;color:#e65100}
.adpill.resolu{background:#e8f5e9;color:#2e7d32}
.adpill.rejete{background:#fce4ec;color:#c62828}
.adpill.banned{background:#fce4ec;color:#c62828}
.adsec{margin-bottom:24px}
.adst{font-size:1.1rem;font-weight:700;margin:0 0 4px}
.adsd{font-size:.8rem;color:#8e8e93;margin-bottom:14px}
.adtw{overflow-x:auto;background:white;border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.06);border:1px solid #f0f0f0}
.adtabl{width:100%;border-collapse:collapse;font-size:.82rem}
.adtabl th{text-align:left;padding:12px 14px;font-weight:600;color:#8e8e93;font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #f0f0f0;background:#fafafa;white-space:nowrap}
.adtabl td{padding:10px 14px;border-bottom:1px solid #f5f5f5;color:#333;vertical-align:middle}
.adtabl tr:hover td{background:#f8f9fd}
.adtabl tr:last-child td{border-bottom:none}
.adsrch{width:100%;max-width:320px;padding:9px 14px;border-radius:10px;border:1.5px solid #e0e0e0;font-size:.82rem;outline:none;transition:border-color .2s;font-family:inherit;background:white;box-sizing:border-box}
.adsrch:focus{border-color:#1a1a2e;box-shadow:0 0 0 3px rgba(26,26,46,.08)}
.adpag{display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 0}
.adpbtn{padding:6px 12px;border-radius:8px;border:1px solid #e0e0e0;background:white;font-size:.78rem;font-weight:500;cursor:pointer;color:#333;font-family:inherit}
.adpbtn:hover{background:#f5f5f5}
.adpbtn:disabled{opacity:.4;cursor:not-allowed}
.adem{text-align:center;padding:40px 20px;color:#8e8e93}
.ademi{font-size:2.5rem;margin-bottom:8px}
.ademt{font-size:1rem;font-weight:600;color:#333;margin:0 0 4px}
.ademd{font-size:.82rem;color:#8e8e93;margin:0}
.adpagehead{display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap}
.adpagehead h2{font-size:1.3rem;font-weight:700;margin:0}
.adpagehead p{font-size:.82rem;color:#8e8e93;margin:0}
.admb{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;animation:fIn .15s ease}
.admcont{background:white;border-radius:16px;width:100%;max-width:480px;max-height:80vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2)}
.admhead{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #f0f0f0}
.admtitle{font-size:.95rem;font-weight:700;color:#1a1a1a}
.admclose{width:28px;height:28px;border:none;border-radius:50%;background:#f0f0f0;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#666}
.admbody{padding:16px 20px;overflow-y:auto;flex:1}
.admact{display:flex;gap:8px;justify-content:flex-end;padding:12px 20px;border-top:1px solid #f0f0f0}
.adtoast{position:fixed;bottom:24px;right:24px;z-index:99999;padding:12px 20px;border-radius:12px;font-size:.82rem;font-weight:600;color:white;box-shadow:0 8px 24px rgba(0,0,0,.15);animation:fIn .2s ease;cursor:pointer}
.adtoast.success{background:#34C759}
.adtoast.error{background:#FF3B30}
.adtoast.info{background:#1a1a2e}
.adempty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;color:#8e8e93}
.adempty-icon{font-size:3rem;margin-bottom:12px;opacity:.5}
.adempty-text{font-size:.95rem;font-weight:600;color:#333;margin-bottom:4px}
.adempty-sub{font-size:.82rem}
.adchart{display:flex;align-items:flex-end;gap:3px;height:100px}
.adcol{flex:1;border-radius:4px 4px 0 0;min-height:2px;transition:height .6s ease}
.adlbl{font-size:.6rem;color:#8e8e93;text-align:center;margin-top:4px;transform:rotate(-45deg);white-space:nowrap}
@media(max-width:768px){
  .adsb{width:60px}
  .adsb .adsbh h1{display:none}
  .adsb .adsbnav a span{display:none}
  .adsb .adsbnav a{justify-content:center;padding:10px 0}
  .adsb .adsbf .usr{display:none}
  .admc{margin-left:60px}
  .adcont{padding:14px}
}
@media(max-width:768px){
  .oda-sidebar{width:36px}
  .oda-pills{display:none}
  .kpi-grid{grid-template-columns:1fr}
  .agent-grid{grid-template-columns:1fr}
}
`;

const NAV = [
  { path: '/dashboard', label: 'Live Monitor', icon: 'dashboard' },
  { path: '/dashboard/agent-hub', label: 'Agent Hub 3D', icon: 'agents' },
  { path: '/dashboard/leads', label: 'Pipeline', icon: 'pipeline' },
  { path: '/dashboard/boutiques', label: 'Boutiques', icon: 'shops' },
  { path: '/dashboard/whatsapp', label: 'WhatsApp', icon: 'whatsapp' },
  { path: '/dashboard/chats', label: 'Chat', icon: 'chat' },
  { path: '/dashboard/distribution', label: 'Distribution', icon: 'distribution' },
  { path: '/dashboard/monitoring', label: 'Monitoring', icon: 'monitoring' },
  { path: '/dashboard/analytics', label: 'Analytics', icon: 'analytics' },
  { path: '/dashboard/logs', label: 'Logs', icon: 'logs' },
  { path: '/dashboard/produits', label: 'Produits', icon: 'products' },
  { path: '/dashboard/commandes', label: 'Commandes', icon: 'orders' },
  { path: '/dashboard/utilisateurs', label: 'Utilisateurs', icon: 'users' },
  { path: '/dashboard/signalements', label: 'Signalements', icon: 'reports' },
  { path: '/dashboard/parametres', label: 'Paramètres', icon: 'settings' },
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [checking, setChecking] = useState(true);
  const [time, setTime] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const s = document.createElement('style'); s.id = 'odal-css'; s.textContent = CSS;
    if (!document.getElementById('odal-css')) document.head.appendChild(s);
    const tick = () => setTime(new Date().toLocaleTimeString('fr-FR'));
    tick(); const si = setInterval(tick, 1000);
    return () => clearInterval(si);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/connexion'); return; }
      setUser(session.user);
      checkAdmin(session.user.id);
    });
  }, [router]);

  async function checkAdmin(uid) {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u?.user_metadata?.admin_role) { setRole(u.user_metadata.admin_role); setChecking(false); return; }
      const { data: d } = await supabase.from('admin_roles').select('role').eq('user_id', uid).single();
      if (d) { setRole(d.role); setChecking(false); return; }
    } catch {}
    const res = await fetch('/api/setup', { method: 'POST', headers: { 'x-admin-id': uid } });
    try { const j = await res.json(); if (j.success) { setRole('super_admin'); setChecking(false); return; } } catch {}
    setRole(false); setChecking(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push('/connexion');
  }

  if (checking) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',flexDirection:'column',gap:12,color:'#999'}}>
    <div style={{width:28,height:28,border:'2.5px solid #e0e0e0',borderTopColor:'#1a1a2e',borderRadius:'50%',animation:'oda-spin .7s linear infinite'}}/>
    <style>{`@keyframes oda-spin{to{transform:rotate(360deg)}}`}</style>
    <span>Vérification...</span>
  </div>;
  if (role === false) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',flexDirection:'column',gap:12}}>
    <SvgIcon name="shield" size={48} color="#999"/>
    <h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#333'}}>Accès restreint</h2>
    <p style={{color:'#999',fontSize:'.85rem'}}>Vous n'avez pas les droits d'administration.</p>
  </div>;

  const ROLES_MAP = { super_admin:'Super Admin', admin:'Admin', moderator:'Modérateur', support:'Support' };
  const pageName = NAV.find(n => n.path === pathname)?.label || 'Tableau de bord';

  return (
    <div className="oda-shell">
      <div className="oda-topbar">
        <div className="oda-logo">
          <button className="oda-toggle-btn" onClick={() => setSidebarOpen(s => !s)} aria-label="Menu">
            <SvgIcon name={sidebarOpen ? 'close' : 'menu'} size={18} color="currentColor"/>
          </button>
          ODA<span>Control</span>
        </div>
        <div className="oda-pills">
          <div className="oda-pill ok"><div className="oda-dot pulse"></div>Système OK</div>
          <div className="oda-pill run"><div className="oda-dot pulse"></div>{pageName}</div>
          <div className="oda-pill warn"><div className="oda-dot"></div>{role ? ROLES_MAP[role] : role}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:11,color:'#999'}}>{user?.email}</span>
          <button onClick={logout} style={{background:'none',border:'none',cursor:'pointer',color:'#999',padding:4,display:'flex'}} title="Déconnexion">
            <SvgIcon name="logout" size={18} color="currentColor"/>
          </button>
        </div>
      </div>

      <div className="oda-body">
        <nav className={`oda-sidebar${sidebarOpen?' open':''}`}>
          {NAV.map(item => (
            <a key={item.path} href={item.path} className={`oda-nav-btn${pathname===item.path?' active':''}`}
              onClick={e=>{e.preventDefault();router.push(item.path);if(window.innerWidth<768)setSidebarOpen(false)}} title={item.label}>
              <span className="icon-only"><SvgIcon name={item.icon} size={18} color="currentColor"/></span>
              <span className="nav-label">{item.label}</span>
            </a>
          ))}
        </nav>

        <main className="oda-content">
          {children}
        </main>
      </div>

      <div className="oda-statusbar">
        <span><div className="oda-dot pulse" style={{background:'#34C759'}}></div>PostgreSQL</span>
        <span><div className="oda-dot pulse" style={{background:'#34C759'}}></div>Redis</span>
        <span><div className="oda-dot pulse" style={{background:'#007AFF'}}></div>DeerFlow</span>
        <span id="status-time">{time}</span>
        <span>Douala, CM</span>
      </div>
    </div>
  );
}
