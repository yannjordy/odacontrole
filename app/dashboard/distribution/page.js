'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRole } from '../RoleContext';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function DistributionPage() {
  const { isAdmin } = useRole();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchCampaigns(); }, []);

  async function fetchCampaigns() {
    setLoading(true);
    const { data } = await supabase.from('distribution_campaigns').select('*').order('created_at', { ascending: false });
    setCampaigns(data || []);
    setLoading(false);
  }

  async function createCampaign() {
    const name = prompt('Nom de la campagne :');
    if (!name) return;
    const appType = prompt("Type d'application (oda_market / oda_seller / oda_control) :", 'oda_market');
    if (!['oda_market','oda_seller','oda_control'].includes(appType)) return alert('Type invalide');
    await supabase.from('distribution_campaigns').insert({
      name,
      app_type: appType,
      target_url: appType === 'oda_market' ? 'https://oda-market.vercel.app' : appType === 'oda_seller' ? 'https://oda-seller.vercel.app' : window.location.origin + '/dashboard',
      status: 'draft',
      channels: ['whatsapp','sms','qr'],
    });
    fetchCampaigns();
  }

  async function toggleStatus(id, status) {
    const newStatus = status === 'active' ? 'paused' : 'active';
    await supabase.from('distribution_campaigns').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    fetchCampaigns();
  }

  const APP_NAMES = { oda_market: 'ODA Market', oda_seller: 'ODA Seller', oda_control: 'ODA Contrôle' };
  const APP_ICONS = { oda_market: '🛒', oda_seller: '🏪', oda_control: '🎛️' };

  return (
    <div>
      <div className="adpagehead">
        <div>
          <h2>📲 Distribution massive</h2>
          <p>Générer des liens, QR codes et campagnes pour distribuer les applications</p>
        </div>
        <div style={{flex:1}}/>
        {isAdmin && (<button className="adbtn adbtn-primary" onClick={createCampaign}>+ Nouvelle campagne</button>)}
      </div>

      {/* Apps quick links */}
      <div className="adg" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        {[
          { app: 'oda_market', url: 'https://oda-market.vercel.app', color: '#D4920A' },
          { app: 'oda_seller', url: 'https://oda-seller.vercel.app', color: '#7C3AED' },
          { app: 'oda_control', url: window.location.origin, color: '#1a1a2e' },
        ].map(a => (
          <div key={a.app} className="adc" style={{textAlign:'center',padding:'28px 20px',border:`2px solid ${a.color}20`}}>
            <div style={{fontSize:'3rem',marginBottom:8}}>{APP_ICONS[a.app]}</div>
            <div style={{fontWeight:700,fontSize:'1rem',marginBottom:4}}>{APP_NAMES[a.app]}</div>
            <div style={{fontSize:'.72rem',color:'#8e8e93',marginBottom:12,wordBreak:'break-all'}}>{a.url}</div>
            <div style={{display:'flex',gap:8,justifyContent:'center'}}>
              <button className="adbtn adbtn-sm adbtn-primary" onClick={() => { navigator.clipboard.writeText(a.url); alert('URL copiée !'); }}>📋 Copier</button>
              <button className="adbtn adbtn-sm adbtn-success" onClick={() => {
                if (navigator.share) navigator.share({ title: APP_NAMES[a.app], url: a.url });
                else alert("Partage non disponible sur ce navigateur");
              }}>📤 Partager</button>
            </div>
            <div style={{marginTop:12}}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(a.url)}`} alt="QR Code" style={{width:100,height:100,borderRadius:8}}/>
            </div>
          </div>
        ))}
      </div>

      {/* Campaigns */}
      <div className="adsec">
        <h3 className="adst">Campagnes de distribution</h3>
        <p className="adsd">Suivez les performances de vos campagnes</p>
        {loading ? <div className="adld"><div className="adsp"/></div> : campaigns.length === 0 ? (
          <div className="adempty"><div className="adempty-icon">📲</div><div className="adempty-text">Aucune campagne</div><div className="adempty-sub">Créez votre première campagne de distribution</div></div>
        ) : (
          <div className="adtw">
            <table className="adtabl">
              <thead><tr><th>Campagne</th><th>App</th><th>Statut</th><th>Clics</th><th>Installs</th><th>Canaux</th><th>Créée le</th><th>Actions</th></tr></thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td><span className="adpill">{APP_ICONS[c.app_type]} {APP_NAMES[c.app_type]}</span></td>
                    <td>
                      <span className="adpill" style={{background: c.status === 'active' ? '#34C75918' : c.status === 'paused' ? '#FF950018' : '#f0f0f0', color: c.status === 'active' ? '#34C759' : c.status === 'paused' ? '#FF9500' : '#999'}}>
                        {c.status === 'active' ? '✅ Active' : c.status === 'paused' ? '⏸️ En pause' : '📝 Brouillon'}
                      </span>
                    </td>
                    <td><strong>{c.total_clicks || 0}</strong></td>
                    <td><strong>{c.total_installs || 0}</strong></td>
                    <td style={{fontSize:'.72rem'}}>{(c.channels || []).join(', ')}</td>
                    <td style={{fontSize:'.72rem',color:'#8e8e93'}}>{new Date(c.created_at).toLocaleDateString('fr-FR')}</td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        {isAdmin && (<button className={`adbtn adbtn-sm ${c.status === 'active' ? 'adbtn-warning' : 'adbtn-success'}`} onClick={() => toggleStatus(c.id, c.status)}>
                          {c.status === 'active' ? '⏸️ Pause' : '▶️ Activer'}
                        </button>)}
                        <button className="adbtn adbtn-sm adbtn-ghost" onClick={() => {
                          if (c.short_link) navigator.clipboard.writeText(c.short_link);
                          const url = c.target_url;
                          navigator.clipboard.writeText(url);
                          alert('Lien copié !');
                        }}>📋 Lien</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
