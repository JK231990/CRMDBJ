import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Download, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, downloadCSV } from '@/lib/utils';
import { Badge, Spinner, EmptyState, Modal } from '@/components/ui';
import type { Product } from '@/types';
import { useAuth } from '@/lib/auth';

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('products').select('*').is('deleted_at', null).order('name');
    if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
    const { data, error } = await query;
    if (error) console.error('Error loading products:', error);
    else setProducts(data as Product[]);
    setLoading(false);
  }, [categoryFilter]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filtered = products.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.karat?.toLowerCase().includes(q);
  });

  const categories = [...new Set(products.map(p => p.category))];

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">Products</h2>
          <p className="text-sm text-ink-secondary">{filtered.length} products</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadCSV('products.csv', filtered.map(p => ({ Name: p.name, Category: p.category, Karat: p.karat, GoldColor: p.gold_color, Weight: p.weight, Price: p.price, StoneType: p.stone_type })))} className="btn-secondary">
            <Download size={16} /> Export
          </button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input pl-9" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-48" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Package size={48} />} title="No products found" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(product => (
            <div key={product.id} className="card-hover p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink truncate">{product.name}</h3>
                  <p className="text-xs text-ink-muted">{product.category}</p>
                </div>
                {product.is_active ? <Badge status="active" /> : <Badge status="inactive" />}
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {product.karat && <span className="badge-neutral">{product.karat}</span>}
                {product.gold_color && <span className="badge-neutral capitalize">{product.gold_color} gold</span>}
                {product.stone_type && <span className="badge-neutral">{product.stone_type}</span>}
                {product.weight && <span className="badge-neutral">{product.weight}g</span>}
              </div>
              {product.description && <p className="text-sm text-ink-secondary mb-3 line-clamp-2">{product.description}</p>}
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-ink">{formatCurrency(product.price)}</span>
                <span className="text-xs text-ink-muted">Gold rate: {formatCurrency(product.gold_rate)}/g</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddProductModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadProducts(); }} />}
    </div>
  );
}

function AddProductModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    name: '', category: 'Rings', karat: '18K', gold_color: 'yellow',
    weight: 0, stone_type: '', stone_price: 0, making_charge: 0,
    gold_rate: 65, price: 0, description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const orgId = profile?.organisation_id;
    if (!orgId) { setError('No organisation found'); setSaving(false); return; }
    const { error } = await supabase.from('products').insert({
      ...form,
      organisation_id: orgId,
      stone_type: form.stone_type || null,
      created_by: profile.id,
    });
    if (error) setError(error.message);
    else onSaved();
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title="Add Product" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-error-light text-error text-sm rounded-xl p-3">{error}</div>}
        <div>
          <label className="label">Product Name *</label>
          <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option>Rings</option><option>Necklaces</option><option>Bracelets</option>
              <option>Earrings</option><option>Thali Set</option><option>Kodi Set</option>
              <option>Piercing</option><option>Other</option>
            </select>
          </div>
          <div>
            <label className="label">Karat</label>
            <select className="input" value={form.karat} onChange={(e) => setForm({ ...form, karat: e.target.value })}>
              <option>18K</option><option>21K</option><option>22K</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Gold Color</label>
            <select className="input" value={form.gold_color} onChange={(e) => setForm({ ...form, gold_color: e.target.value })}>
              <option value="yellow">Yellow</option>
              <option value="white">White</option>
              <option value="rose">Rose</option>
            </select>
          </div>
          <div>
            <label className="label">Weight (g)</label>
            <input type="number" step="0.001" className="input" value={form.weight} onChange={(e) => setForm({ ...form, weight: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Stone Type</label>
            <input className="input" value={form.stone_type} onChange={(e) => setForm({ ...form, stone_type: e.target.value })} />
          </div>
          <div>
            <label className="label">Stone Price (CHF)</label>
            <input type="number" step="0.01" className="input" value={form.stone_price} onChange={(e) => setForm({ ...form, stone_price: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Gold Rate/g</label>
            <input type="number" step="0.01" className="input" value={form.gold_rate} onChange={(e) => setForm({ ...form, gold_rate: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="label">Making (CHF)</label>
            <input type="number" step="0.01" className="input" value={form.making_charge} onChange={(e) => setForm({ ...form, making_charge: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="label">Price (CHF)</label>
            <input type="number" step="0.01" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Spinner size={16} /> : 'Add Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
