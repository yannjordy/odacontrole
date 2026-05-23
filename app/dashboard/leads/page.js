'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRole } from '../RoleContext';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const STATUS_FLOW = ['new','contacted','consented','onboarding','shop_created','products_published','validated'];
const STATUS_LABELS = { new:'Nouveau', contacted:'Contacté', consented:'Consentement', onboarding:'En onboarding', shop_created:'Boutique créée', products_published:'Produits publiés', validated:'Validé', rejected:'Rejeté', inactive:'Inactif' };
const STATUS_COLORS = { new:'#8e8e93', contacted:'#007AFF', consented:'#FF9500', onboarding:'#5856D6', shop_created:'#34C759', products_published:'#1a1a2e', validated:'#34C759', rejected:'#FF3B30', inactive:'#999' };
const STATUS_MAP = { 'new':'new', 'contacted':'contacted', 'consented':'consented', 'onboarding':'onboarding', 'shop_created':'shop_created', 'products_published':'products_published', 'validated':'validated', 'rejected':'rejected', 'inactive':'inactive' };
function effectiveStatus(lead) { return lead.status === 'contacted' && lead.consent_given ? 'consented' : (STATUS_MAP[lead.status] || lead.status); }

export default function LeadsPage() {
  const { isAdmin } = useRole();
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [modal, setModal] = useState(null);
  const PAGE_SIZE = 20;

  useEffect(() => { fetchLeads(); }, [page, statusFilter, search]);

  async function fetchLeads() {
    setLoading(true);
    try {
      let q = supabase.from('leads').select('*', { count: 'exact' });
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      if (search) q = q.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,business_name.ilike.%${search}%`);
      q = q.order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      const { data, count } = await q;
      setLeads(data || []);

      const { data: statsData } = await supabase.from('leads').select('status,consent_given');
      const s = { total: 0 };
      STATUS_FLOW.concat(['rejected','inactive']).forEach(st => { s[st] = 0; });
      (statsData || []).forEach(l => {
        const st = l.status === 'contacted' && l.consent_given ? 'consented' : l.status;
        s[st] = (s[st] || 0) + 1; s.total++;
      });
      setStats(s);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function updateLeadStatus(id, status) {
    await supabase.from('leads').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    fetchLeads(); setModal(null);
    toast('Statut mis à jour', 'success');
  }

  function toast(msg, type = 'info') {
    const t = document.createElement('div'); t.className = 'adtoast ' + type;
    t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300) }, 3000);
  }

  const filtered = leads;
  const totalPages = Math.ceil((stats.total || 0) / PAGE_SIZE);

  return (
    <div>
      <div className="adpagehead">
        <div style={{display:'flex',flexDirection:'column'}}>
          <h2>🎯 Pipeline d'acquisition</h2>
          <p>Prospects → Consentement → Boutique → Validation</p>
        </div>
        <div style={{flex:1}}/>
        {isAdmin && (<button className="adbtn adbtn-primary" onClick={() => setModal({ type: 'add' })}>+ Nouveau lead</button>)}
      </div>

      {/* Funnel stats */}
      <div className="adg" style={{gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))'}}>
        {STATUS_FLOW.map(st => (
          <div key={st} className="adc" style={{borderLeft:`3px solid ${STATUS_COLORS[st]}`}}>
            <div className="adcl">{STATUS_LABELS[st]}</div>
            <div className="adcv" style={{fontSize:'1.4rem'}}>{stats[st] || 0}</div>
            {st !== 'validated' && (
              <div className="adcbar"><div style={{width: stats.total ? ((stats[st]||0)/stats.total*100)+'%' : '0%', background: STATUS_COLORS[st]}}/></div>
            )}
          </div>
        ))}
        <div className="adc" style={{borderLeft:'3px solid #FF3B30'}}>
          <div className="adcl">Rejetés</div>
          <div className="adcv" style={{fontSize:'1.4rem',color:'#FF3B30'}}>{stats.rejected || 0}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <input className="adsrch" placeholder="Rechercher nom, téléphone, boutique…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}/>
        <select className="adsrch" style={{maxWidth:180}} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
          <option value="all">Tous les statuts</option>
          {STATUS_FLOW.concat(['rejected','inactive']).map(st => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
        </select>
        <span style={{fontSize:'.82rem',color:'#8e8e93'}}>{stats.total || 0} leads</span>
      </div>

      {/* Table */}
      {loading ? <div className="adld"><div className="adsp"/></div> : leads.length === 0 ? (
        <div className="adempty"><div className="adempty-icon">🎯</div><div className="adempty-text">Aucun lead</div><div className="adempty-sub">Les prospects apparaîtront ici après acquisition</div></div>
      ) : (
        <div className="adtw">
          <table className="adtabl">
            <thead>
              <tr>
                <th>Prospect</th><th>Contact</th><th>Boutique</th><th>Statut</th><th>Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id}>
                  <td><strong>{lead.full_name || '—'}</strong></td>
                  <td>
                    <div>{lead.phone}</div>
                    {lead.email && <div style={{fontSize:'.7rem',color:'#8e8e93'}}>{lead.email}</div>}
                  </td>
                  <td>
                    {lead.business_name ? (
                      <span style={{fontWeight:600}}>{lead.business_name}</span>
                    ) : '—'}
                    {lead.city && <div style={{fontSize:'.7rem',color:'#8e8e93'}}>{lead.city}</div>}
                  </td>
                  <td>
                    {(() => { const es = effectiveStatus(lead); return (
                    <span className={`adpill`} style={{background: STATUS_COLORS[es] + '18', color: STATUS_COLORS[es], border: '1px solid ' + STATUS_COLORS[es] + '30'}}>
                      {STATUS_LABELS[es] || es}
                    </span>
                    ); })()}
                  </td>
                  <td style={{fontSize:'.75rem',color:'#8e8e93'}}>{new Date(lead.created_at).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <div style={{display:'flex',gap:6}}>
                      {isAdmin && (<select className="adpbtn" style={{padding:'4px 8px',fontSize:'.7rem'}} value={effectiveStatus(lead)} onChange={e => updateLeadStatus(lead.id, e.target.value)}>
                        {STATUS_FLOW.concat(['rejected','inactive']).map(st => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
                      </select>)}
                      <button className="adpbtn" onClick={() => setModal(lead)} style={{fontSize:'.7rem',padding:'4px 8px'}}>Détails</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="adpag">
              <button className="adpbtn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>←</button>
              <span style={{fontSize:'.82rem',color:'#8e8e93'}}>{page + 1}/{totalPages}</span>
              <button className="adpbtn" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>→</button>
            </div>
          )}
        </div>
      )}

      {/* Lead Detail Modal */}
      {modal && modal.id && (
        <div className="admb" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="admcont">
            <div className="admhead">
              <span className="admtitle">{modal.full_name || 'Lead'}</span>
              <button className="admclose" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="admbody">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                {[
                  { label: 'Téléphone', value: modal.phone },
                  { label: 'Email', value: modal.email || '—' },
                  { label: 'Ville', value: modal.city || '—' },
                  { label: 'Boutique', value: modal.business_name || '—' },
                  { label: 'Type', value: modal.business_type || '—' },
                  { label: 'Source', value: modal.source || '—' },
                  { label: 'Consentement', value: modal.consent_given ? '✅ Oui' : '❌ Non' },
                  { label: 'Date de création', value: new Date(modal.created_at).toLocaleDateString('fr-FR') },
                ].map((f, i) => (
                  <div key={i}>
                    <div style={{fontSize:'.7rem',fontWeight:600,color:'#8e8e93',marginBottom:2}}>{f.label}</div>
                    <div style={{fontSize:'.85rem',fontWeight:600}}>{f.value}</div>
                  </div>
                ))}
              </div>
              {modal.notes && <div style={{marginTop:16}}><div style={{fontSize:'.7rem',fontWeight:600,color:'#8e8e93',marginBottom:4}}>Notes</div><p style={{fontSize:'.82rem',color:'#555'}}>{modal.notes}</p></div>}
              <div style={{marginTop:16}}>
                <div style={{fontSize:'.7rem',fontWeight:600,color:'#8e8e93',marginBottom:8}}>Pipeline</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {isAdmin && STATUS_FLOW.map(st => (
                    <button key={st} onClick={() => updateLeadStatus(modal.id, st)}
                      style={{padding:'6px 12px',borderRadius:8,border:'none',fontSize:'.72rem',fontWeight:600,cursor:'pointer',
                        background: effectiveStatus(modal) === st ? STATUS_COLORS[st] : '#f0f0f0',
                        color: effectiveStatus(modal) === st ? 'white' : '#555'
                      }}>{STATUS_LABELS[st]}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {modal && modal.type === 'add' && (
        <AddLeadModal onClose={() => setModal(null)} onCreated={fetchLeads} supabase={supabase} isAdmin={isAdmin} STATUS_FLOW={STATUS_FLOW} STATUS_LABELS={STATUS_LABELS}/>
      )}
    </div>
  );
}

function AddLeadModal({ onClose, onCreated, supabase, isAdmin }) {
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', city: '', business_name: '', business_type: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f => ({...f, [k]: e.target.value}));

  async function save() {
    if (!form.phone) { alert('Le téléphone est requis'); return; }
    setSaving(true);
    await supabase.from('leads').insert({ ...form, status: 'new', source: 'manual' });
    setSaving(false);
    onCreated();
    onClose();
  }

  return (
    <div className="admb" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admcont">
        <div className="admhead">
          <span className="admtitle">Nouveau lead</span>
          <button className="admclose" onClick={onClose}>✕</button>
        </div>
        <div className="admbody">
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[
              { key: 'full_name', label: 'Nom complet', placeholder: 'Jean Dupont' },
              { key: 'phone', label: 'Téléphone *', placeholder: '+237 6XX XXX XXX', required: true },
              { key: 'email', label: 'Email', placeholder: 'jean@email.com' },
              { key: 'city', label: 'Ville', placeholder: 'Douala' },
              { key: 'business_name', label: 'Nom de la boutique', placeholder: 'Ma Boutique' },
              { key: 'business_type', label: 'Type de commerce', placeholder: 'Alimentation, Mode, ...' },
            ].map(f => (
              <div key={f.key}>
                <label style={{fontSize:'.72rem',fontWeight:600,color:'#555',display:'block',marginBottom:4}}>{f.label}</label>
                <input className="adsrch" style={{maxWidth:'100%'}} value={form[f.key]} onChange={set(f.key)} placeholder={f.placeholder} required={f.required}/>
              </div>
            ))}
            <div>
              <label style={{fontSize:'.72rem',fontWeight:600,color:'#555',display:'block',marginBottom:4}}>Notes</label>
              <textarea className="adsrch" style={{maxWidth:'100%',minHeight:60,resize:'vertical'}} value={form.notes} onChange={set('notes')} placeholder="Notes additionnelles..."/>
            </div>
          </div>
        </div>
        <div className="admact">
          <button className="adbtn adbtn-ghost" onClick={onClose}>Annuler</button>
          {isAdmin && (<button className="adbtn adbtn-primary" onClick={save} disabled={saving}>{saving ? 'Création...' : 'Créer le lead'}</button>)}
        </div>
      </div>
    </div>
  );
}
