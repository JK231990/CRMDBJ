import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, UserPlus, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate, downloadCSV } from '@/lib/utils';
import { Badge, Spinner, EmptyState, Modal } from '@/components/ui';
import type { Lead, Customer, Profile } from '@/types';
import { useAuth } from '@/lib/auth';

export function Leads() {
  const [leads, setLeads] = useState<(Lead & { customer?: Customer; assigned_employee?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('leads')
      .select('*, customer:customers(*), assigned_employee:profiles(*)')
      .order('created_at', { ascending: false });

    if (sourceFilter !== 'all') query = query.eq('source', sourceFilter);
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data, error } = await query;
    if (error) console.error('Error loading leads:', error);
    else setLeads(data as (Lead & { customer?: Customer; assigned_employee?: Profile })[]);
    setLoading(false);
  }, [sourceFilter, statusFilter]);

  useEffect(() => {
    loadLeads();
    supabase.from('customers').select('*').then(({ data }) => setCustomers(data as Customer[] ?? []));
    supabase.from('profiles').select('*').then(({ data }) => setProfiles(data as Profile[] ?? []));
  }, [loadLeads]);

  const filtered = leads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.source.toLowerCase().includes(q) ||
      l.notes?.toLowerCase().includes(q) ||
      l.customer?.first_name?.toLowerCase().includes(q);
  });

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('leads').update({ status, converted_at: status === 'converted' ? new Date().toISOString() : null }).eq('id', id);
    loadLeads();
  };

  const newLeads = leads.filter(l => l.status === 'new').length;
  const contacted = leads.filter(l => l.status === 'contacted').length;
  const converted = leads.filter(l => l.status === 'converted').length;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">Leads</h2>
          <p className="text-sm text-ink-secondary">{newLeads} new · {contacted} contacted · {converted} converted</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadCSV('leads.csv', filtered.map(l => ({
            Source: l.source, Status: l.status, Priority: l.priority,
            Customer: l.customer ? `${l.customer.first_name} ${l.customer.last_name}` : 'N/A',
            Notes: l.notes ?? '', CreatedAt: l.created_at,
          })))} className="btn-secondary">
            <Download size={16} /> Export
          </button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Lead
          </button>
        </div>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input pl-9" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-40" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="all">All Sources</option>
          <option value="walk_in">Walk-in</option>
          <option value="referral">Referral</option>
          <option value="google_ads">Google Ads</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
          <option value="jotform">Jotform</option>
          <option value="tiktok">TikTok</option>
        </select>
        <select className="input sm:w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="converted">Converted</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size={32} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<UserPlus size={48} />} title="No leads found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-light">
                <tr className="text-left text-ink-muted">
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Assigned</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Notes</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => (
                  <tr key={lead.id} className="border-t border-surface-border hover:bg-surface-light transition-colors">
                    <td className="px-4 py-3 capitalize text-ink">{lead.source.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-ink-secondary">
                      {lead.customer ? `${lead.customer.first_name} ${lead.customer.last_name}` : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-ink-secondary hidden md:table-cell">
                      {lead.assigned_employee?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-ink-muted hidden lg:table-cell max-w-[200px] truncate">{lead.notes ?? '—'}</td>
                    <td className="px-4 py-3"><Badge status={lead.priority} /></td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                        className="text-xs border border-surface-border rounded-lg px-2 py-1 bg-white"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="converted">Converted</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-ink-secondary hidden md:table-cell">{formatDate(lead.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddLeadModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadLeads(); }} customers={customers} profiles={profiles} />}
    </div>
  );
}

function AddLeadModal({ onClose, onSaved, customers, profiles }: {
  onClose: () => void; onSaved: () => void;
  customers: Customer[]; profiles: Profile[];
}) {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    customer_id: '', source: 'walk_in', status: 'new', priority: 'medium',
    assigned_employee_id: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const orgId = profile?.organisation_id;
    if (!orgId) { setError('No organisation found'); setSaving(false); return; }
    const { error } = await supabase.from('leads').insert({
      ...form,
      organisation_id: orgId,
      customer_id: form.customer_id || null,
      assigned_employee_id: form.assigned_employee_id || null,
      created_by: profile.id,
    });
    if (error) setError(error.message);
    else onSaved();
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title="Add Lead" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-error-light text-error text-sm rounded-xl p-3">{error}</div>}
        <div>
          <label className="label">Customer</label>
          <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
            <option value="">No linked customer</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Source</label>
          <select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
            <option value="walk_in">Walk-in</option>
            <option value="referral">Referral</option>
            <option value="google_ads">Google Ads</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="jotform">Jotform</option>
            <option value="tiktok">TikTok</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Assign To</label>
          <select className="input" value={form.assigned_employee_id} onChange={(e) => setForm({ ...form, assigned_employee_id: e.target.value })}>
            <option value="">Unassigned</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Spinner size={16} /> : 'Add Lead'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
