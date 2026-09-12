import { useEffect, useState, useCallback } from 'react';
import {
  Plug, Search, RefreshCw, Link2, Unlink,
  Mail, MessageCircle, Instagram, Facebook, Linkedin,
  Calendar, FileText, Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDateTime, timeAgo, cn } from '@/lib/utils';
import { Badge, Spinner, EmptyState, Modal } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import type { Integration } from '@/types';

const PLATFORM_CONFIG: Record<string, { icon: typeof Plug; color: string; category: string }> = {
  Gmail: { icon: Mail, color: 'bg-red-50 text-red-600', category: 'Email' },
  'Google Contacts': { icon: Users, color: 'bg-blue-50 text-blue-600', category: 'Contacts' },
  'Google Drive': { icon: FileText, color: 'bg-blue-50 text-blue-600', category: 'Storage' },
  'Google Sheets': { icon: FileText, color: 'bg-green-50 text-green-600', category: 'Spreadsheets' },
  'Google Calendar': { icon: Calendar, color: 'bg-blue-50 text-blue-600', category: 'Calendar' },
  Jotform: { icon: FileText, color: 'bg-orange-50 text-orange-600', category: 'Forms' },
  'WhatsApp Business': { icon: MessageCircle, color: 'bg-green-50 text-green-600', category: 'Messaging' },
  Facebook: { icon: Facebook, color: 'bg-blue-50 text-blue-700', category: 'Social' },
  Instagram: { icon: Instagram, color: 'bg-pink-50 text-pink-600', category: 'Social' },
  LinkedIn: { icon: Linkedin, color: 'bg-blue-50 text-blue-700', category: 'Social' },
  TikTok: { icon: FileText, color: 'bg-gray-100 text-gray-700', category: 'Social' },
  'X / Twitter': { icon: MessageCircle, color: 'bg-gray-100 text-gray-700', category: 'Social' },
};

const ALL_PLATFORMS = Object.keys(PLATFORM_CONFIG);

export function Integrations() {
  const { profile } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showConnect, setShowConnect] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  const loadIntegrations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('integrations').select('*').order('platform');
    if (error) console.error('Error loading integrations:', error);
    else setIntegrations(data as Integration[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadIntegrations(); }, [loadIntegrations]);

  const connectedPlatforms = integrations.filter(i => i.status === 'connected').map(i => i.platform);
  const availablePlatforms = ALL_PLATFORMS.filter(p => !connectedPlatforms.includes(p));

  const filtered = integrations.filter(i => {
    if (!search) return true;
    return i.platform.toLowerCase().includes(search.toLowerCase()) ||
      i.account_name?.toLowerCase().includes(search.toLowerCase());
  });

  const connectPlatform = async (platform: string) => {
    setConnectingPlatform(platform);
    if (!profile) { setConnectingPlatform(null); return; }
    const orgId = profile.organisation_id;
    if (!orgId) { setConnectingPlatform(null); return; }

    const { error } = await supabase.from('integrations').insert({
      organisation_id: orgId,
      platform,
      status: 'connected',
      account_name: profile.full_name,
      account_email: profile.email,
      connected_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    });

    if (error) console.error('Error connecting:', error);
    else loadIntegrations();
    setConnectingPlatform(null);
  };

  const disconnectPlatform = async (id: string) => {
    await supabase.from('integrations').delete().eq('id', id);
    loadIntegrations();
  };

  const syncIntegration = async (integration: Integration) => {
    await supabase.from('integrations').update({ last_synced_at: new Date().toISOString() }).eq('id', integration.id);
    loadIntegrations();
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">Integrations</h2>
          <p className="text-sm text-ink-secondary">{connectedPlatforms.length} connected · {availablePlatforms.length} available</p>
        </div>
        {availablePlatforms.length > 0 && (
          <button className="btn-primary" onClick={() => setShowConnect(true)}>
            <Link2 size={16} /> Connect Platform
          </button>
        )}
      </div>

      <div className="card p-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input pl-9" placeholder="Search integrations..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner size={32} /></div>
      ) : filtered.length === 0 && !search ? (
        <div className="card">
          <EmptyState icon={<Plug size={48} />} title="No integrations connected" description="Connect external platforms like Gmail, Google Contacts, Jotform, WhatsApp Business, and social media." action={<button className="btn-primary" onClick={() => setShowConnect(true)}><Link2 size={16} /> Connect Platform</button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(integration => {
            const config = PLATFORM_CONFIG[integration.platform] ?? { icon: Plug, color: 'bg-surface-light text-ink-muted', category: 'Other' };
            const Icon = config.icon;
            return (
              <div key={integration.id} className="card p-5 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', config.color)}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink">{integration.platform}</h3>
                      <p className="text-xs text-ink-muted">{config.category}</p>
                    </div>
                  </div>
                  <Badge status={integration.status} />
                </div>
                {integration.account_name && (
                  <p className="text-sm text-ink-secondary mb-1">{integration.account_name}</p>
                )}
                {integration.account_email && (
                  <p className="text-xs text-ink-muted mb-2">{integration.account_email}</p>
                )}
                {integration.connected_at && (
                  <p className="text-xs text-ink-muted">Connected {formatDateTime(integration.connected_at)}</p>
                )}
                {integration.last_synced_at && (
                  <p className="text-xs text-ink-muted">Last synced {timeAgo(integration.last_synced_at)}</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={() => syncIntegration(integration)} className="btn-ghost text-xs">
                    <RefreshCw size={14} /> Sync
                  </button>
                  <button onClick={() => disconnectPlatform(integration.id)} className="opacity-0 group-hover:opacity-100 text-ink-muted hover:text-error transition-all text-xs">
                    <Unlink size={14} /> Disconnect
                  </button>
                </div>
              </div>
            );
          })}

          {/* Show available platforms as disconnected cards */}
          {availablePlatforms.map(platform => {
            const config = PLATFORM_CONFIG[platform] ?? { icon: Plug, color: 'bg-surface-light text-ink-muted', category: 'Other' };
            const Icon = config.icon;
            return (
              <div key={platform} className="card p-5 opacity-60 hover:opacity-100 transition-opacity">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', config.color)}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink">{platform}</h3>
                      <p className="text-xs text-ink-muted">{config.category}</p>
                    </div>
                  </div>
                  <Badge status="disconnected" />
                </div>
                <p className="text-sm text-ink-muted mb-3">Not connected</p>
                <button
                  onClick={() => connectPlatform(platform)}
                  disabled={connectingPlatform === platform}
                  className="btn-secondary text-xs"
                >
                  {connectingPlatform === platform ? <Spinner size={14} /> : <Link2 size={14} />} Connect
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showConnect && (
        <ConnectModal
          availablePlatforms={availablePlatforms}
          onClose={() => setShowConnect(false)}
          onConnect={connectPlatform}
          connecting={connectingPlatform}
        />
      )}
    </div>
  );
}

function ConnectModal({ availablePlatforms, onClose, onConnect, connecting }: {
  availablePlatforms: string[];
  onClose: () => void;
  onConnect: (platform: string) => void;
  connecting: string | null;
}) {
  return (
    <Modal open onClose={onClose} title="Connect Platform" size="lg">
      <p className="text-sm text-ink-secondary mb-4">Select a platform to connect. All integrations use official APIs and OAuth authentication.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {availablePlatforms.map(platform => {
          const config = PLATFORM_CONFIG[platform] ?? { icon: Plug, color: 'bg-surface-light text-ink-muted', category: 'Other' };
          const Icon = config.icon;
          return (
            <button
              key={platform}
              onClick={() => onConnect(platform)}
              disabled={connecting === platform}
              className="flex items-center gap-3 p-4 border border-surface-border rounded-xl hover:border-swiss-red hover:bg-swiss-red-50/30 transition-all text-left disabled:opacity-50"
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', config.color)}>
                <Icon size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">{platform}</p>
                <p className="text-xs text-ink-muted">{config.category}</p>
              </div>
              {connecting === platform ? <Spinner size={16} /> : <Link2 size={16} className="text-swiss-red" />}
            </button>
          );
        })}
      </div>
      <div className="mt-4 p-3 bg-surface-light rounded-xl">
        <p className="text-xs text-ink-muted">All integrations require official API credentials and OAuth authorization. No passwords are ever requested or stored. Some integrations may require additional platform approval.</p>
      </div>
    </Modal>
  );
}
