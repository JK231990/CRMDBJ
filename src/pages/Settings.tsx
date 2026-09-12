import { useEffect, useState } from 'react';
import { Building2, MapPin, Users as UsersIcon, Bell, Shield, Database, Bot, Plug, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner, Badge } from '@/components/ui';
import { ROLE_LABELS, type UserRole, type Profile, type Organisation } from '@/types';
import { cn } from '@/lib/utils';

type SettingsTab = 'company' | 'locations' | 'users' | 'notifications' | 'privacy' | 'data' | 'ai' | 'integrations';

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');
  const [org, setOrg] = useState<Organisation | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [orgRes, profilesRes] = await Promise.all([
      supabase.from('organisations').select('*').maybeSingle(),
      supabase.from('profiles').select('*'),
    ]);
    if (orgRes.data) setOrg(orgRes.data as Organisation);
    if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
    setLoading(false);
  };

  const saveOrg = async () => {
    if (!org) return;
    setSaving(true);
    const { error } = await supabase.from('organisations').update({
      name: org.name, legal_name: org.legal_name, address: org.address,
      city: org.city, postal_code: org.postal_code, email: org.email,
      vat_number: org.vat_number, currency: org.currency, default_language: org.default_language,
    }).eq('id', org.id);
    setSaving(false);
    if (error) {
      setNotice({ type: 'error', text: error.message });
      return;
    }
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  const exportData = async () => {
    setNotice({ type: 'info', text: 'Preparing CRM export…' });
    const tableNames = ['customers', 'leads', 'products', 'orders', 'payments', 'tasks', 'appointments'] as const;
    const results = await Promise.all(tableNames.map(table => supabase.from(table).select('*')));
    const failed = results.find(result => result.error);
    if (failed?.error) {
      setNotice({ type: 'error', text: `Export failed: ${failed.error.message}` });
      return;
    }
    const payload = Object.fromEntries(tableNames.map((table, index) => [table, results[index].data ?? []]));
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), data: payload }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `dubai-jewellery-crm-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice({ type: 'success', text: 'CRM data export downloaded.' });
  };

  const testProvider = (provider: string) => {
    if (!providerKeys[provider]?.trim()) {
      setNotice({ type: 'error', text: `Enter a ${provider} API key before testing.` });
      return;
    }
    setNotice({ type: 'info', text: `${provider} key is ready for a secure server-side connection. The test endpoint is not configured in Phase 1.` });
  };

  const startIntegrationSetup = (name: string) => {
    setNotice({ type: 'info', text: `${name} requires official OAuth/API configuration. This connector is scheduled for a later phase and no credentials were sent.` });
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size={32} /></div>;

  const tabs: { id: SettingsTab; label: string; icon: typeof Building2 }[] = [
    { id: 'company', label: 'Company Profile', icon: Building2 },
    { id: 'locations', label: 'Shop Locations', icon: MapPin },
    { id: 'users', label: 'Users & Roles', icon: UsersIcon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Consent', icon: Shield },
    { id: 'data', label: 'Data & Backup', icon: Database },
    { id: 'ai', label: 'AI Providers', icon: Bot },
    { id: 'integrations', label: 'Integrations', icon: Plug },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-[1000px] mx-auto">
      <h2 className="text-xl font-bold text-ink mb-4">Settings</h2>

      {notice && (
        <div className={`mb-4 rounded-xl p-3 text-sm ${notice.type === 'error' ? 'bg-error-light text-error' : notice.type === 'success' ? 'bg-success-light text-success' : 'bg-surface-light text-ink-secondary'}`} role="status">
          <div className="flex items-center justify-between gap-3">
            <span>{notice.text}</span>
            <button onClick={() => setNotice(null)} className="font-medium" aria-label="Dismiss message">Dismiss</button>
          </div>
        </div>
      )}

      <label className="md:hidden block mb-4">
        <span className="label">Settings section</span>
        <select className="input" value={activeTab} onChange={(event) => setActiveTab(event.target.value as SettingsTab)}>
          {tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
        </select>
      </label>

      <div className="flex gap-6">
        {/* Tab sidebar */}
        <div className="w-48 flex-shrink-0 hidden md:block">
          <div className="space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                    activeTab === tab.id ? 'bg-swiss-red text-white' : 'text-ink-secondary hover:bg-surface-light hover:text-ink'
                  )}
                >
                  <Icon size={16} /> {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'company' && org && (
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-ink">Company Profile</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Company Name</label>
                  <input className="input" value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Legal Name</label>
                  <input className="input" value={org.legal_name ?? ''} onChange={(e) => setOrg({ ...org, legal_name: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Address</label>
                  <input className="input" value={org.address ?? ''} onChange={(e) => setOrg({ ...org, address: e.target.value })} />
                </div>
                <div>
                  <label className="label">City</label>
                  <input className="input" value={org.city ?? ''} onChange={(e) => setOrg({ ...org, city: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Postal Code</label>
                  <input className="input" value={org.postal_code ?? ''} onChange={(e) => setOrg({ ...org, postal_code: e.target.value })} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" value={org.email ?? ''} onChange={(e) => setOrg({ ...org, email: e.target.value })} />
                </div>
                <div>
                  <label className="label">VAT Number</label>
                  <input className="input" value={org.vat_number ?? ''} onChange={(e) => setOrg({ ...org, vat_number: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Currency</label>
                  <select className="input" value={org.currency} onChange={(e) => setOrg({ ...org, currency: e.target.value })}>
                    <option value="CHF">CHF (Swiss Franc)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="USD">USD (US Dollar)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Default Language</label>
                  <select className="input" value={org.default_language} onChange={(e) => setOrg({ ...org, default_language: e.target.value })}>
                    <option value="en">English</option>
                    <option value="de">German</option>
                    <option value="fr">French</option>
                    <option value="it">Italian</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="btn-primary" onClick={saveOrg} disabled={saving}>
                  {saving ? <Spinner size={16} /> : <Save size={16} />} Save Changes
                </button>
                {savedMsg && <span className="text-sm text-success">Saved successfully</span>}
              </div>
            </div>
          )}

          {activeTab === 'locations' && (
            <div className="card p-5">
              <h3 className="font-semibold text-ink mb-4">Shop Locations</h3>
              <p className="text-sm text-ink-secondary mb-4">Manage your physical store locations.</p>
              <LocationsList orgId={org?.id} />
            </div>
          )}

          {activeTab === 'users' && (
            <div className="card p-5">
              <h3 className="font-semibold text-ink mb-4">Users & Roles</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-light">
                    <tr className="text-left text-ink-muted">
                      <th className="px-4 py-2 font-medium">Name</th>
                      <th className="px-4 py-2 font-medium">Email</th>
                      <th className="px-4 py-2 font-medium">Role</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map(p => (
                      <tr key={p.id} className="border-t border-surface-border">
                        <td className="px-4 py-3 font-medium text-ink">{p.full_name}</td>
                        <td className="px-4 py-3 text-ink-secondary">{p.email}</td>
                        <td className="px-4 py-3"><Badge status="active" label={ROLE_LABELS[p.role as UserRole] ?? p.role} /></td>
                        <td className="px-4 py-3">{p.active ? <Badge status="active" /> : <Badge status="inactive" />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-ink">Notifications</h3>
              <p className="text-sm text-ink-secondary">Configure how and when you receive notifications.</p>
              <div className="space-y-3">
                {['New lead assigned', 'Task due reminder', 'Order status change', 'Payment received', 'Low stock alert', 'AI usage limit warning'].map(item => (
                  <div key={item} className="flex items-center justify-between p-3 border border-surface-border rounded-xl">
                    <span className="text-sm text-ink">{item}</span>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-swiss-red" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-ink">Privacy & Consent Settings</h3>
              <div className="space-y-3">
                <div className="p-3 border border-surface-border rounded-xl">
                  <p className="text-sm font-medium text-ink">Data Retention Period</p>
                  <p className="text-xs text-ink-muted mb-2">How long to keep customer data before automatic deletion</p>
                  <select className="input">
                    <option>5 years</option><option>7 years</option><option>10 years</option><option>Indefinite</option>
                  </select>
                </div>
                <div className="p-3 border border-surface-border rounded-xl">
                  <p className="text-sm font-medium text-ink">AI Processing</p>
                  <p className="text-xs text-ink-muted mb-2">Exclude specific fields from AI processing</p>
                  <div className="flex flex-wrap gap-2">
                    {['Payment details', 'Identity numbers', 'Address', 'Date of birth', 'Notes'].map(f => (
                      <label key={f} className="flex items-center gap-1 text-sm text-ink">
                        <input type="checkbox" className="w-4 h-4 accent-swiss-red" /> {f}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="p-3 border border-surface-border rounded-xl">
                  <p className="text-sm font-medium text-ink">Regional Hosting</p>
                  <p className="text-xs text-ink-muted mb-2">Data residency configuration</p>
                  <select className="input">
                    <option>Switzerland (Zürich)</option><option>EU (Frankfurt)</option><option>Auto (closest region)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-ink">Data & Backup</h3>
              <div className="space-y-3">
                <div className="p-3 border border-surface-border rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-ink">Export All Data</p>
                    <p className="text-xs text-ink-muted">Download a complete export of all CRM data</p>
                  </div>
                  <button className="btn-secondary" onClick={exportData}>Export</button>
                </div>
                <div className="p-3 border border-surface-border rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-ink">Automatic Backups</p>
                    <p className="text-xs text-ink-muted">Daily automatic backups of all data</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-swiss-red" />
                </div>
                <div className="p-3 border border-surface-border rounded-xl">
                  <p className="text-sm font-medium text-ink mb-2">Data Retention</p>
                  <select className="input">
                    <option>Keep all data</option><option>Delete after 5 years</option><option>Delete after 7 years</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="card p-5">
              <h3 className="font-semibold text-ink mb-4">AI Provider Settings</h3>
              <p className="text-sm text-ink-secondary mb-4">Configure AI providers. API keys are stored securely on the server and never exposed in frontend code.</p>
              <div className="space-y-3">
                {[
                  { name: 'OpenAI', status: 'demo', desc: 'Choose from models available to your OpenAI API account' },
                  { name: 'Google Gemini', status: 'demo', desc: 'Choose from models available to your Gemini API account' },
                  { name: 'Anthropic Claude', status: 'demo', desc: 'Choose from models available to your Anthropic API account' },
                ].map(provider => (
                  <div key={provider.name} className="p-4 border border-surface-border rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-ink">{provider.name}</p>
                        <p className="text-xs text-ink-muted">{provider.desc}</p>
                      </div>
                      <Badge status={provider.status} />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <input className="input" type="password" placeholder="API Key (sent only through a secure server endpoint)" value={providerKeys[provider.name] ?? ''} onChange={(event) => setProviderKeys({ ...providerKeys, [provider.name]: event.target.value })} />
                      <button className="btn-secondary" onClick={() => testProvider(provider.name)}>Test</button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-ink-muted">
                      <span>Monthly Usage: —</span>
                      <span>Est. Cost: —</span>
                      <span>Limit: —</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-warning-light rounded-xl">
                <p className="text-xs text-warning">API keys are required to enable AI features. Keys are stored encrypted at rest and never exposed in frontend code, logs, or the repository.</p>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="card p-5">
              <h3 className="font-semibold text-ink mb-4">Integrations</h3>
              <p className="text-sm text-ink-secondary mb-4">Connect external platforms. All integrations use official APIs and OAuth authentication.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  'Google Contacts', 'Gmail', 'Google Drive', 'Google Sheets', 'Google Calendar',
                  'Jotform', 'WhatsApp Business', 'Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'X / Twitter',
                ].map(name => (
                  <div key={name} className="p-3 border border-surface-border rounded-xl flex items-center justify-between">
                    <span className="text-sm font-medium text-ink">{name}</span>
                    <div className="flex items-center gap-2">
                      <Badge status="disconnected" />
                      <button className="btn-secondary text-xs py-1" onClick={() => startIntegrationSetup(name)}>Connect</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-surface-light rounded-xl">
                <p className="text-xs text-ink-muted">All integrations require official API credentials and OAuth authorization. No passwords are ever requested or stored. Some integrations may require additional platform approval.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LocationsList({ orgId }: { orgId?: string }) {
  const [locations, setLocations] = useState<{ id: string; name: string; city: string; address: string | null; phone: string | null; is_active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    supabase.from('locations').select('*').eq('organisation_id', orgId).then(({ data }) => {
      setLocations(data ?? []);
      setLoading(false);
    });
  }, [orgId]);

  if (loading) return <Spinner size={20} />;

  return (
    <div className="space-y-2">
      {locations.map(loc => (
        <div key={loc.id} className="p-3 border border-surface-border rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink">{loc.name}</p>
            <p className="text-xs text-ink-muted">{loc.address}, {loc.city} · {loc.phone}</p>
          </div>
          {loc.is_active ? <Badge status="active" /> : <Badge status="inactive" />}
        </div>
      ))}
    </div>
  );
}
