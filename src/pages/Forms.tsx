import { useEffect, useState, useCallback } from 'react';
import {
  FileText, Plus, Search, RefreshCw, Trash2, Download,
  CheckCircle2, ArrowRight, Link2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDateTime, timeAgo, downloadCSV, cn } from '@/lib/utils';
import { Badge, Spinner, EmptyState, Modal } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import type { Form, FormSubmission, Customer } from '@/types';

export function Forms() {
  const { profile } = useAuth();
  const [forms, setForms] = useState<Form[]>([]);
  const [submissions, setSubmissions] = useState<(FormSubmission & { form?: Form; customer?: Customer })[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'forms' | 'submissions'>('forms');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showConnect, setShowConnect] = useState(false);

  const loadForms = useCallback(async () => {
    setLoading(true);
    const [formsRes, subsRes] = await Promise.all([
      supabase.from('forms').select('*').order('created_at', { ascending: false }),
      supabase.from('form_submissions')
        .select('*, form:forms(*), customer:customers(*)')
        .order('submitted_at', { ascending: false }),
    ]);
    if (formsRes.data) setForms(formsRes.data as Form[]);
    if (subsRes.data) setSubmissions(subsRes.data as (FormSubmission & { form?: Form; customer?: Customer })[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadForms(); }, [loadForms]);

  const filteredSubs = submissions.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const mapped = s.mapped_data as Record<string, string>;
    return Object.values(mapped).some(v => String(v).toLowerCase().includes(q)) ||
      s.form?.name.toLowerCase().includes(q);
  });

  const newCount = submissions.filter(s => s.status === 'new').length;
  const convertedCount = submissions.filter(s => s.status === 'converted').length;

  const convertToLead = async (sub: FormSubmission) => {
    const mapped = sub.mapped_data as Record<string, string>;
    if (!profile) return;
    const orgId = profile.organisation_id;
    if (!orgId) return;

    const firstName = mapped.first_name ?? mapped.name ?? 'Unknown';
    const lastName = mapped.last_name ?? '';
    const email = mapped.email ?? '';
    const phone = mapped.phone ?? '';

    let customerId: string | null = null;

    if (email || phone) {
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .or(`email.eq.${email}`)
        .maybeSingle();
      if (existing) customerId = existing.id;
    }

    if (!customerId) {
      const { data: newCustomer } = await supabase.from('customers').insert({
        organisation_id: orgId,
        first_name: firstName,
        last_name: lastName || 'Unknown',
        email: email || null,
        phone: phone || null,
        customer_source: 'jotform',
        status: 'lead',
        tags: [],
        created_by: profile.id,
      }).select('id').single();
      if (newCustomer) customerId = newCustomer.id;
    }

    if (customerId) {
      await supabase.from('leads').insert({
        organisation_id: orgId,
        customer_id: customerId,
        source: 'jotform',
        status: 'new',
        priority: 'medium',
        notes: mapped.message ?? mapped.budget ?? '',
        created_by: profile.id,
      });
    }

    await supabase.from('form_submissions').update({ status: 'converted', customer_id: customerId }).eq('id', sub.id);
    loadForms();
  };

  const deleteForm = async (id: string) => {
    await supabase.from('forms').delete().eq('id', id);
    loadForms();
  };

  const syncForm = async (form: Form) => {
    await supabase.from('forms').update({ last_synced_at: new Date().toISOString() }).eq('id', form.id);
    loadForms();
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">Forms</h2>
          <p className="text-sm text-ink-secondary">{forms.length} forms · {newCount} new submissions · {convertedCount} converted</p>
        </div>
        <button className="btn-primary" onClick={() => setShowConnect(true)}>
          <Plus size={16} /> Connect Form
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('forms')}
          className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-colors', tab === 'forms' ? 'bg-swiss-red text-white' : 'bg-surface-light text-ink-secondary hover:text-ink')}
        >
          Connected Forms
        </button>
        <button
          onClick={() => setTab('submissions')}
          className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-colors', tab === 'submissions' ? 'bg-swiss-red text-white' : 'bg-surface-light text-ink-secondary hover:text-ink')}
        >
          Submissions {newCount > 0 && <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{newCount}</span>}
        </button>
      </div>

      {tab === 'submissions' && (
        <div className="card p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input className="input pl-9" placeholder="Search submissions..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input sm:w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="converted">Converted</option>
          </select>
          <button onClick={() => downloadCSV('form-submissions.csv', filteredSubs.map(s => ({
            Form: s.form?.name ?? '', Status: s.status, ...s.mapped_data as Record<string, string>,
            Submitted: s.submitted_at,
          })))} className="btn-secondary">
            <Download size={16} /> Export
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner size={32} /></div>
      ) : tab === 'forms' ? (
        forms.length === 0 ? (
          <div className="card">
            <EmptyState icon={<FileText size={48} />} title="No forms connected" description="Connect a Jotform or manual form to start collecting submissions as leads." action={<button className="btn-primary" onClick={() => setShowConnect(true)}><Plus size={16} /> Connect Form</button>} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {forms.map(form => (
              <div key={form.id} className="card p-5 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-swiss-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText size={18} className="text-swiss-red" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink">{form.name}</h3>
                      <p className="text-xs text-ink-muted capitalize">{form.source} · {form.external_id ?? 'Manual'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={form.status} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center">
                    <p className="text-xs text-ink-muted">Submissions</p>
                    <p className="text-sm font-semibold text-ink">{form.submission_count}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-ink-muted">Mapped Fields</p>
                    <p className="text-sm font-semibold text-ink">{Object.keys(form.field_mapping).length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-ink-muted">Last Sync</p>
                    <p className="text-sm font-semibold text-ink">{form.last_synced_at ? timeAgo(form.last_synced_at) : '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => syncForm(form)} className="btn-ghost text-xs">
                    <RefreshCw size={14} /> Sync
                  </button>
                  <button onClick={() => deleteForm(form.id)} className="opacity-0 group-hover:opacity-100 text-ink-muted hover:text-error transition-all text-xs">
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredSubs.length === 0 ? (
        <div className="card">
          <EmptyState icon={<FileText size={48} />} title="No submissions found" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-light">
                <tr className="text-left text-ink-muted">
                  <th className="px-4 py-3 font-medium">Form</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Email</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Message</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Submitted</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map(sub => {
                  const mapped = sub.mapped_data as Record<string, string>;
                  return (
                    <tr key={sub.id} className="border-t border-surface-border hover:bg-surface-light transition-colors">
                      <td className="px-4 py-3 text-ink-secondary text-xs">{sub.form?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-ink font-medium">{mapped.first_name ?? mapped.name ?? '—'} {mapped.last_name ?? ''}</td>
                      <td className="px-4 py-3 text-ink-secondary hidden md:table-cell">{mapped.email ?? '—'}</td>
                      <td className="px-4 py-3 text-ink-muted hidden lg:table-cell max-w-[200px] truncate">{mapped.message ?? mapped.budget ?? '—'}</td>
                      <td className="px-4 py-3"><Badge status={sub.status} /></td>
                      <td className="px-4 py-3 text-ink-secondary hidden md:table-cell">{formatDateTime(sub.submitted_at)}</td>
                      <td className="px-4 py-3">
                        {sub.status === 'new' ? (
                          <button onClick={() => convertToLead(sub)} className="btn-ghost text-xs text-swiss-red">
                            <ArrowRight size={14} /> Convert
                          </button>
                        ) : (
                          <span className="text-xs text-success flex items-center gap-1"><CheckCircle2 size={14} /> Converted</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showConnect && <ConnectFormModal onClose={() => setShowConnect(false)} onSaved={() => { setShowConnect(false); loadForms(); }} />}
    </div>
  );
}

function ConnectFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth();
  const [form, setForm] = useState({ name: '', source: 'jotform', external_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const orgId = profile?.organisation_id;
    if (!orgId) { setError('No organisation found'); setSaving(false); return; }

    const { error } = await supabase.from('forms').insert({
      organisation_id: orgId,
      name: form.name,
      source: form.source,
      external_id: form.external_id || null,
      status: 'active',
      field_mapping: form.source === 'jotform'
        ? { first_name: 'q1_name', last_name: 'q2_name', email: 'q3_email', phone: 'q4_phone', message: 'q5_message' }
        : { first_name: 'name', email: 'email', phone: 'phone', message: 'message' },
      last_synced_at: new Date().toISOString(),
    });

    if (error) setError(error.message);
    else onSaved();
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title="Connect Form" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-error-light text-error text-sm rounded-xl p-3">{error}</div>}
        <div>
          <label className="label">Form Name</label>
          <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Custom Ring Enquiry" />
        </div>
        <div>
          <label className="label">Source</label>
          <select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
            <option value="jotform">Jotform</option>
            <option value="manual">Manual / Website</option>
          </select>
        </div>
        {form.source === 'jotform' && (
          <div>
            <label className="label">Jotform Form ID</label>
            <input className="input" value={form.external_id} onChange={(e) => setForm({ ...form, external_id: e.target.value })} placeholder="e.g. 234812" />
          </div>
        )}
        <div className="bg-surface-light rounded-xl p-3">
          <p className="text-xs text-ink-secondary">
            Field mappings will be auto-detected from your form. You can adjust them after connecting.
            Submissions will appear in the Submissions tab where you can convert them to leads.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Spinner size={16} /> : <Link2 size={16} />} Connect
          </button>
        </div>
      </form>
    </Modal>
  );
}
