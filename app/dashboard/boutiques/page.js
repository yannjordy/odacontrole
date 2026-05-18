'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const STATUS_COLORS = { pending:'#FF9500', active:'#34C759', suspended:'#FF3B30', rejected:'#FF3B30', inactive:'#999' };
const STATUS_LABELS = { pending:'En attente', active:'Active', suspended:'Suspendue', rejected:'Rejetée', inactive:'Inactive' };

export default function ShopsPage() {
  const [shops, setShops] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => { fetchShops(); }, [page, search]);

  async function fetchShops() {
    setLoading(true);
    try {
      let q = supabase.from('shops').select('*, leads(full_name,phone)', { count: 'exact' });
      if (search) q = q.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
      q = q.order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      const { data, count } = await q;
      setShops(data || []);

      const { data: s } = await supabase.from('shops').select('status');
      const st = { total: 0, active: 0, pending: 0, suspended: 0 };
      (s || []).forEach(sh => { st[sh.status] = (st[sh.status] || 0) + 1; st.total++; });
      setStats(st);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function updateStatus(id, status) {
    await supabase.from('shops').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    fetchShops();
  }

  return (
    <div>
      <div className="adpagehead">
        <div>
          <h2>🏪 Boutiques</h2>
          <p>Gestion des boutiques créées via le pipeline d'acquisition</p>
        </div>
        <div style={{flex:1}}/>
      </div>

      <div className="adg">
        <div className="adc"><div className="adcl">Total boutiques</div><div className="adcv">{stats.total}</div></div>
        <div className="adc" style={{borderLeft:'3px solid #34C759'}}><div className="adcl">Actives</div><div className="adcv" style={{color:'#34C759'}}>{stats.active || 0}</div></div>
        <div className="adc" style={{borderLeft:'3px solid #FF9500'}}><div className="adcl">En attente</div><div className="adcv" style={{color:'#FF9500'}}>{stats.pending || 0}</div></div>
        <div className="adc" style={{borderLeft:'3px solid #FF3B30'}}><div className="adcl">Suspendues</div><div className="adcv" style={{color:'#FF3B30'}}>{stats.suspended || 0}</div></div>
      </div>

      <div style={{display:'flex',gap:12,marginBottom:16}}>
        <input className="adsrch" placeholder="Rechercher boutique…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}/>
      </div>

      {loading ? <div className="adld"><div className="adsp"/></div> : shops.length === 0 ? (
        <div className="adempty"><div className="adempty-icon">🏪</div><div className="adempty-text">Aucune boutique</div><div className="adempty-sub">Les boutiques apparaîtront après le pipeline d'acquisition</div></div>
      ) : (
        <div className="adtw">
          <table className="adtabl">
            <thead><tr><th>Boutique</th><th>Vendeur</th><th>Slug</th><th>Produits</th><th>Statut</th><th>Créée le</th><th>Actions</th></tr></thead>
            <tbody>
              {shops.map(shop => (
                <tr key={shop.id}>
                  <td><strong>{shop.name}</strong></td>
                  <td>
                    <div>{shop.leads?.full_name || '—'}</div>
                    <div style={{fontSize:'.7rem',color:'#8e8e93'}}>{shop.leads?.phone || ''}</div>
                  </td>
                  <td style={{fontSize:'.75rem',color:'#555'}}>{shop.slug || '—'}</td>
                  <td><strong>{shop.products_count || 0}</strong></td>
                  <td><span className="adpill" style={{background: STATUS_COLORS[shop.status] + '18', color: STATUS_COLORS[shop.status]}}>{STATUS_LABELS[shop.status] || shop.status}</span></td>
                  <td style={{fontSize:'.75rem',color:'#8e8e93'}}>{new Date(shop.created_at).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <select className="adpbtn" style={{padding:'4px 8px',fontSize:'.7rem'}} value={shop.status} onChange={e => updateStatus(shop.id, e.target.value)}>
                      {Object.keys(STATUS_LABELS).map(st => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
