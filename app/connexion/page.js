'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Connexion() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dashboard');
      else setChecking(false);
    });
  }, [router]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    router.push('/dashboard');
  }

  if (checking) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f5f5f7' }}>
      <div style={{ color:'#8e8e93', fontSize:'.85rem' }}>Vérification…</div>
    </div>
  );

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f5f5f7', fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' }}>
      <form onSubmit={handleLogin} style={{ background:'white', padding:'40px 36px', borderRadius:20, boxShadow:'0 8px 32px rgba(0,0,0,.08)', width:'100%', maxWidth:400 }}>
        <div style={{ fontSize:'1.5rem', fontWeight:700, marginBottom:4, display:'flex', alignItems:'center', gap:10 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          ODA Contrôle
        </div>
        <p style={{ fontSize:'.82rem', color:'#8e8e93', marginBottom:24 }}>Tour de contrôle — administration</p>
        {error && <div style={{ padding:'10px 14px', background:'#fff0f0', color:'#FF3B30', borderRadius:10, fontSize:'.82rem', marginBottom:16 }}>{error}</div>}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:'.78rem', fontWeight:600, color:'#666', marginBottom:4, display:'block' }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e0e0e0', borderRadius:10, fontSize:'.85rem', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:'.78rem', fontWeight:600, color:'#666', marginBottom:4, display:'block' }}>Mot de passe</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
            style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e0e0e0', borderRadius:10, fontSize:'.85rem', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
        </div>
        <button type="submit" disabled={loading}
          style={{ width:'100%', padding:'11px', borderRadius:10, border:'none', background:'#1a1a2e', color:'white', fontWeight:600, fontSize:'.85rem', cursor:'pointer', fontFamily:'inherit' }}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
