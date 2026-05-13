'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{background:#f1f3f5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#1a1a1a}

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
.admh{display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap}
.admh h2{font-size:1.3rem;font-weight:700;margin:0}
.admh p{font-size:.82rem;color:#8e8e93;margin:0}

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

@keyframes fIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
`;

const NAV = [
  { section: 'Principal' },
  { path: '/dashboard', label: 'Tableau de bord', icon: '📊' },
  { path: '/dashboard/analytics', label: 'Analytiques', icon: '📈' },
  { section: 'Gestion' },
  { path: '/dashboard/produits', label: 'Produits', icon: '📦' },
  { path: '/dashboard/services', label: 'Services', icon: '🛎️' },
  { path: '/dashboard/utilisateurs', label: 'Utilisateurs', icon: '👥' },
  { path: '/dashboard/commandes', label: 'Commandes', icon: '📋' },
  { path: '/dashboard/abonnements', label: 'Abonnements', icon: '💳' },
  { section: 'Modération' },
  { path: '/dashboard/signalements', label: 'Signalements', icon: '🚩' },
  { path: '/dashboard/trafic', label: 'Trafic', icon: '📊' },
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [checking, setChecking] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined' && !document.getElementById('adl-css')) {
      const s = document.createElement('style'); s.id = 'adl-css'; s.textContent = CSS;
      document.head.appendChild(s);
    }
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

  if (checking) return <div className="adld"><div className="adsp" /><span>Vérification…</span></div>;
  if (role === false) return <div className="adld"><div style={{fontSize:'3rem'}}>🔒</div><h2 style={{fontSize:'1.2rem',fontWeight:700,color:'#333',margin:0}}>Accès restreint</h2><p style={{color:'#8e8e93',fontSize:'.85rem'}}>Vous n&apos;avez pas les droits d&apos;administration.</p></div>;

  const ROLES_MAP = { super_admin:'Super Admin', admin:'Admin', moderator:'Modérateur', support:'Support' };
  const pageName = NAV.find(n => n.path === pathname)?.label || 'Tableau de bord';

  return (
    <div className="adl">
      <aside className={`adsb${collapsed?' collapsed':''}`}>
        <div className="adsbh">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <h1>ODA Contrôle</h1>
        </div>
        <nav className="adsbnav">
          {NAV.map((item, i) => item.section ? (
            <div key={i} className="sec-label">{item.section}</div>
          ) : (
            <a key={item.path} href={item.path} className={pathname===item.path?'active':''}
              onClick={e=>{e.preventDefault();router.push(item.path)}}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="adsbf">
          <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#1a1a2e,#5856D6)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'.7rem',fontWeight:700,flexShrink:0}}>
            {user?.email?.charAt(0)?.toUpperCase()||'?'}
          </div>
          <div className="usr">
            <div className="nm">{user?.email?.split('@')[0]}</div>
            <div className="ml">{user?.email}</div>
          </div>
          <button onClick={logout} style={{background:'none',border:'none',cursor:'pointer',fontSize:'1rem',color:'#999',padding:4,display:'flex'}} title="Déconnexion">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      <main className={`admc${collapsed?' expanded':''}`}>
        <div className="admh">
          <button className="toggle" onClick={() => setCollapsed(c => !c)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="bread"><strong>{pageName}</strong></div>
          <div className="spacer"></div>
          <span className={`user-badge ${role}`}>{ROLES_MAP[role]||role}</span>
        </div>
        <div className="adcont">
          {children}
        </div>
      </main>
    </div>
  );
}
