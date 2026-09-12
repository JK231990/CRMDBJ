import { useEffect, useState } from 'react';
import { ScrollText, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDateTime, downloadCSV } from '@/lib/utils';
import { Spinner, EmptyState, Badge } from '@/components/ui';
import type { AuditLog, Profile } from '@/types';

export function AuditLog() {
  const [logs, setLogs] = useState<(AuditLog & { user?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('audit_logs')
      .select('*, user:profiles(*)')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) console.error('Error loading audit logs:', error);
        else setLogs(data as (AuditLog & { user?: Profile })[] ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size={32} /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">Audit Log</h2>
          <p className="text-sm text-ink-secondary">{logs.length} recent actions</p>
        </div>
        <button onClick={() => downloadCSV('audit-log.csv', logs.map(l => ({
          Action: l.action, Entity: l.entity_type ?? '', EntityId: l.entity_id ?? '',
          User: l.user?.full_name ?? 'System', Details: JSON.stringify(l.details ?? {}),
          Timestamp: l.created_at,
        })))} className="btn-secondary">
          <Download size={16} /> Export
        </button>
      </div>

      <div className="card p-5">
        {logs.length === 0 ? (
          <EmptyState icon={<ScrollText size={40} />} title="No audit entries" />
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-3 py-2 border-b border-surface-border last:border-0">
                <div className="w-8 h-8 bg-surface-light rounded-lg flex items-center justify-center flex-shrink-0">
                  <ScrollText size={14} className="text-ink-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">{log.user?.full_name ?? 'System'}</span>
                    <Badge status="active" label={log.action.replace(/_/g, ' ')} />
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {log.entity_type && <span>{log.entity_type} · </span>}
                    {formatDateTime(log.created_at)}
                  </p>
                  {log.details && (
                    <p className="text-xs text-ink-muted mt-0.5 font-mono">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
