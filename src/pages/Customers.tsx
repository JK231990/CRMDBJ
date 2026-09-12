import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Download, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, getLanguageLabel, downloadCSV } from '@/lib/utils';
import { Badge, Avatar, Spinner, EmptyState, Modal } from '@/components/ui';
import type { Customer, Profile } from '@/types';
import { CustomerDetail } from './CustomerDetail';
import { useAuth } from '@/lib/auth';

export function Customers() {
  const [customers, setCustomers] = useState<(Customer & { assigned_employee?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('customers')
      .select('*, assigned_employee:profiles(*)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (cityFilter !== 'all') query = query.eq('city', cityFilter);

    const { data, error } = await query;
    if (error) {
      console.error('Error loading customers:', error);
    } else {
      setCustomers(data as (Customer & { assigned_employee?: Profile })[]);
    }
    setLoading(false);
  }, [statusFilter, cityFilter]);

  useEffect(() => {
    loadCustomers();
    supabase.from('profiles').select('*').then(({ data }) => {
      const map: Record<string, Profile> = {};
      (data ?? []).forEach(p => { map[p.id] = p as Profile; });
      setProfiles(map);
    });
  }, [loadCustomers]);

  const filtered = customers.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.customer_code?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q)
    );
  });

  const cities = [...new Set(customers.map(c => c.city).filter(Boolean))] as string[];

  if (selectedId) {
    return <CustomerDetail customerId={selectedId} onBack={() => { setSelectedId(null); loadCustomers(); }} />;
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">Customers</h2>
          <p className="text-sm text-ink-secondary">{filtered.length} customers</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadCSV('customers.csv', filtered.map(c => ({
              Code: c.customer_code, FirstName: c.first_name, LastName: c.last_name,
              Email: c.email, Phone: c.phone, City: c.city, Status: c.status,
              Language: getLanguageLabel(c.preferred_language), LifetimeValue: c.lifetime_value,
              OutstandingBalance: c.outstanding_balance, MarketingConsent: c.marketing_consent,
            })))}
            className="btn-secondary"
          >
            <Download size={16} /> Export
          </button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Customer
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            className="input pl-9"
            placeholder="Search by name, email, phone, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="lead">Lead</option>
        </select>
        <select className="input sm:w-40" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
          <option value="all">All Cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size={32} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users size={48} />} title="No customers found" description="Try adjusting your filters or add a new customer." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-light">
                <tr className="text-left text-ink-muted">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Contact</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">City</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Language</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Lifetime Value</th>
                  <th className="px-4 py-3 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => setSelectedId(customer.id)}
                    className="border-t border-surface-border hover:bg-surface-light cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar firstName={customer.first_name} lastName={customer.last_name} url={customer.avatar_url} size={36} />
                        <div className="min-w-0">
                          <p className="font-medium text-ink truncate">{customer.first_name} {customer.last_name}</p>
                          <p className="text-xs text-ink-muted">{customer.customer_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-ink-secondary truncate max-w-[180px]">{customer.email ?? '—'}</p>
                      <p className="text-xs text-ink-muted">{customer.phone ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-ink-secondary">{customer.city ?? '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="badge-neutral">{getLanguageLabel(customer.preferred_language)}</span>
                    </td>
                    <td className="px-4 py-3"><Badge status={customer.status} /></td>
                    <td className="px-4 py-3 text-right font-medium text-ink">{formatCurrency(customer.lifetime_value)}</td>
                    <td className="px-4 py-3 text-right">
                      {customer.outstanding_balance > 0 ? (
                        <span className="text-error font-medium">{formatCurrency(customer.outstanding_balance)}</span>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddCustomerModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadCustomers(); }} profiles={profiles} />}
    </div>
  );
}

function AddCustomerModal({ onClose, onSaved, profiles }: { onClose: () => void; onSaved: () => void; profiles: Record<string, Profile> }) {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', whatsapp_number: '',
    address: '', city: '', postal_code: '', country: 'Switzerland',
    preferred_language: 'en', preferred_channel: 'email', customer_source: 'walk_in',
    assigned_employee_id: '', status: 'active', marketing_consent: false,
    profiling_consent: false, notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const orgId = profile?.organisation_id;
    if (!orgId) {
      setError('No organisation found');
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('customers').insert({
      ...form,
      organisation_id: orgId,
      assigned_employee_id: form.assigned_employee_id || null,
      tags: [],
      created_by: profile.id,
    });

    if (error) setError(error.message);
    else onSaved();
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title="Add New Customer" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-error-light text-error text-sm rounded-xl p-3">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">First Name *</label>
            <input className="input" required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Last Name *</label>
            <input className="input" required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">WhatsApp Number</label>
            <input className="input" value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} />
          </div>
          <div>
            <label className="label">City</label>
            <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Preferred Language</label>
            <select className="input" value={form.preferred_language} onChange={(e) => setForm({ ...form, preferred_language: e.target.value })}>
              <option value="en">English</option>
              <option value="de">German</option>
              <option value="fr">French</option>
              <option value="it">Italian</option>
              <option value="ta">Tamil</option>
            </select>
          </div>
          <div>
            <label className="label">Preferred Channel</label>
            <select className="input" value={form.preferred_channel} onChange={(e) => setForm({ ...form, preferred_channel: e.target.value })}>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Phone</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Customer Source</label>
            <select className="input" value={form.customer_source} onChange={(e) => setForm({ ...form, customer_source: e.target.value })}>
              <option value="walk_in">Walk-in</option>
              <option value="referral">Referral</option>
              <option value="google_ads">Google Ads</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="jotform">Jotform</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>
          <div>
            <label className="label">Assigned Employee</label>
            <select className="input" value={form.assigned_employee_id} onChange={(e) => setForm({ ...form, assigned_employee_id: e.target.value })}>
              <option value="">Unassigned</option>
              {Object.values(profiles).filter(p => p.role === 'sales_employee' || p.role === 'manager').map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.marketing_consent} onChange={(e) => setForm({ ...form, marketing_consent: e.target.checked })} />
            Marketing consent
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.profiling_consent} onChange={(e) => setForm({ ...form, profiling_consent: e.target.checked })} />
            Profiling consent
          </label>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Spinner size={16} /> : 'Save Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
