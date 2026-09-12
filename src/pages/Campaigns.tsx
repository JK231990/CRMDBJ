import { useEffect, useState, useCallback } from 'react';
import {
  Megaphone, Plus, Search, Download, Mail, MessageCircle,
  Users, Send, Eye, MousePointerClick, Calendar, Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate, formatDateTime, downloadCSV, cn } from '@/lib/utils';
import { Badge, Spinner, EmptyState, Modal } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import type { Campaign, Customer, Profile } from '@/types';

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  whatsapp: MessageCircle,
};

export function Campaigns() {
  const [campaigns, setCampaigns] = useState<(Campaign & { creator?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('campaigns')
      .select('*, creator:profiles(*)')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data, error } = await query;
    if (error) console.error('Error loading campaigns:', error);
    else setCampaigns(data as (Campaign & { creator?: Profile })[]);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    loadCampaigns();
    supabase.from('customers').select('*').is('deleted_at', null).then(({ data }) => setCustomers(data as Customer[] ?? []));
  }, [loadCampaigns]);

  const filtered = campaigns.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
  });

  const deleteCampaign = async (id: string) => {
    await supabase.from('campaigns').delete().eq('id', id);
    loadCampaigns();
  };

  const totalSent = campaigns.reduce((sum, c) => sum + c.sent_count, 0);
  const totalOpened = campaigns.reduce((sum, c) => sum + c.opened_count, 0);
  const totalClicked = campaigns.reduce((sum, c) => sum + c.clicked_count, 0);
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
  const clickRate = totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">Campaigns</h2>
          <p className="text-sm text-ink-secondary">{campaigns.length} campaigns · {totalSent} sent · {openRate}% open rate · {clickRate}% click rate</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadCSV('campaigns.csv', filtered.map(c => ({
            Name: c.name, Channel: c.channel, Status: c.status,
            Audience: c.audience_count, Sent: c.sent_count, Opened: c.opened_count,
            Clicked: c.clicked_count, Created: c.created_at,
          })))} className="btn-secondary">
            <Download size={16} /> Export
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Campaign
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Megaphone} label="Total Campaigns" value={String(campaigns.length)} />
        <StatCard icon={Send} label="Messages Sent" value={String(totalSent)} />
        <StatCard icon={Eye} label="Open Rate" value={`${openRate}%`} />
        <StatCard icon={MousePointerClick} label="Click Rate" value={`${clickRate}%`} />
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input pl-9" placeholder="Search campaigns..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="sent">Sent</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Megaphone size={48} />} title="No campaigns found" description="Create your first marketing campaign to reach customers." action={<button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New Campaign</button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(campaign => {
            const ChannelIcon = CHANNEL_ICONS[campaign.channel] ?? Mail;
            const openRate = campaign.sent_count > 0 ? Math.round((campaign.opened_count / campaign.sent_count) * 100) : 0;
            const clickRate = campaign.sent_count > 0 ? Math.round((campaign.clicked_count / campaign.sent_count) * 100) : 0;
            return (
              <div key={campaign.id} className="card p-5 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-swiss-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <ChannelIcon size={18} className="text-swiss-red" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink">{campaign.name}</h3>
                      <p className="text-xs text-ink-muted">{campaign.channel} · by {campaign.creator?.full_name ?? 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={campaign.status} />
                    {campaign.status === 'draft' && (
                      <button onClick={() => deleteCampaign(campaign.id)} className="opacity-0 group-hover:opacity-100 text-ink-muted hover:text-error transition-all">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {campaign.description && <p className="text-sm text-ink-secondary mb-3">{campaign.description}</p>}

                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="text-center">
                    <p className="text-xs text-ink-muted">Audience</p>
                    <p className="text-sm font-semibold text-ink">{campaign.audience_count}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-ink-muted">Sent</p>
                    <p className="text-sm font-semibold text-ink">{campaign.sent_count}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-ink-muted">Opened</p>
                    <p className="text-sm font-semibold text-ink">{openRate}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-ink-muted">Clicked</p>
                    <p className="text-sm font-semibold text-ink">{clickRate}%</p>
                  </div>
                </div>

                {campaign.status === 'sent' && campaign.sent_at && (
                  <p className="text-xs text-ink-muted">Sent {formatDateTime(campaign.sent_at)}</p>
                )}
                {campaign.status === 'scheduled' && campaign.scheduled_at && (
                  <p className="text-xs text-ink-muted flex items-center gap-1">
                    <Calendar size={12} /> Scheduled for {formatDateTime(campaign.scheduled_at)}
                  </p>
                )}
                {campaign.status === 'draft' && (
                  <p className="text-xs text-ink-muted">Created {formatDate(campaign.created_at)}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && <CreateCampaignModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); loadCampaigns(); }} customers={customers} />}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Megaphone; label: string; value: string }) {
  return (
    <div className="card p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-muted font-medium">{label}</span>
        <Icon size={18} className="text-swiss-red" />
      </div>
      <span className="text-2xl font-bold text-ink">{value}</span>
    </div>
  );
}

function CreateCampaignModal({ onClose, onSaved, customers }: {
  onClose: () => void; onSaved: () => void; customers: Customer[];
}) {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    name: '',
    description: '',
    channel: 'email',
    status: 'draft',
    template_subject: '',
    template_body: '',
    tag_filter: '',
    status_filter: 'all',
    consent_only: true,
  scheduled_at: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audienceCount = customers.filter(c => {
    if (form.consent_only && !c.marketing_consent) return false;
    if (form.status_filter !== 'all' && c.status !== form.status_filter) return false;
    if (form.tag_filter && !c.tags.includes(form.tag_filter)) return false;
    return true;
  }).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const orgId = profile?.organisation_id;
    if (!orgId) { setError('No organisation found'); setSaving(false); return; }

    const segmentRules: Record<string, unknown> = {};
    if (form.tag_filter) segmentRules.tags = [form.tag_filter];
    if (form.status_filter !== 'all') segmentRules.status = form.status_filter;
    segmentRules.marketing_consent = form.consent_only;

    const { error } = await supabase.from('campaigns').insert({
      organisation_id: orgId,
      name: form.name,
      description: form.description || null,
      channel: form.channel,
      status: form.status,
      segment_rules: segmentRules,
      audience_count: audienceCount,
      template_subject: form.template_subject || null,
      template_body: form.template_body || null,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      created_by: profile.id,
    });

    if (error) setError(error.message);
    else onSaved();
    setSaving(false);
  };

  const allTags = Array.from(new Set(customers.flatMap(c => c.tags))).sort();

  return (
    <Modal open onClose={onClose} title="Create Campaign" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-error-light text-error text-sm rounded-xl p-3">{error}</div>}

        <div>
          <label className="label">Campaign Name</label>
          <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Winter 2025 Gold Collection" />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Campaign description..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Channel</label>
            <select className="input" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
        </div>

        {/* Segment Builder */}
        <div className="border border-surface-border rounded-xl p-4 space-y-3 bg-surface-light/50">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-swiss-red" />
            <span className="text-sm font-medium text-ink">Target Audience</span>
            <span className="ml-auto badge-red">{audienceCount} customers</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Filter by Tag</label>
              <select className="input" value={form.tag_filter} onChange={(e) => setForm({ ...form, tag_filter: e.target.value })}>
                <option value="">All tags</option>
                {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Filter by Status</label>
              <select className="input" value={form.status_filter} onChange={(e) => setForm({ ...form, status_filter: e.target.value })}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="lead">Lead</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-secondary">
            <input
              type="checkbox"
              checked={form.consent_only}
              onChange={(e) => setForm({ ...form, consent_only: e.target.checked })}
              className="w-4 h-4 rounded text-swiss-red focus:ring-swiss-red"
            />
            Only include customers with marketing consent
          </label>
        </div>

        {form.channel === 'email' && (
          <div>
            <label className="label">Email Subject</label>
            <input className="input" value={form.template_subject} onChange={(e) => setForm({ ...form, template_subject: e.target.value })} placeholder="Email subject line..." />
          </div>
        )}

        <div>
          <label className="label">Message Body</label>
          <textarea className="input" rows={5} value={form.template_body} onChange={(e) => setForm({ ...form, template_body: e.target.value })} placeholder="Use {first_name} for personalization..." />
        </div>

        {form.status === 'scheduled' && (
          <div>
            <label className="label">Schedule Date & Time</label>
            <input type="datetime-local" className="input" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Spinner size={16} /> : 'Create Campaign'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
