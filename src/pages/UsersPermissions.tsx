import { useEffect, useState } from 'react';
import { Shield, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Badge, Spinner } from '@/components/ui';
import { ROLE_LABELS, type UserRole, type Profile } from '@/types';
import { downloadCSV, formatDate } from '@/lib/utils';

export function UsersPermissions() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at').then(({ data }) => {
      setProfiles(data as Profile[] ?? []);
      setLoading(false);
    });
  }, []);

  const rolePermissions: Record<UserRole, string[]> = {
    super_admin: ['Full application access', 'Manage integrations', 'Manage users', 'Configure AI', 'View audit logs', 'Company settings', 'Privacy rules'],
    manager: ['View all customers', 'Export reports', 'Assign tasks', 'Use AI assistant', 'View team performance'],
    sales_employee: ['View permitted customers', 'Add notes', 'Create orders', 'Manage follow-ups', 'Use AI (limited)'],
    marketing_employee: ['View consented customers', 'Create segments', 'Draft campaigns', 'No sensitive data'],
    accountant: ['View invoices', 'View payments', 'Export accounting', 'No modifications'],
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size={32} /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">Users & Permissions</h2>
          <p className="text-sm text-ink-secondary">{profiles.length} users</p>
        </div>
        <button onClick={() => downloadCSV('users.csv', profiles.map(p => ({ Name: p.full_name, Email: p.email, Role: ROLE_LABELS[p.role as UserRole], Active: p.active })))} className="btn-secondary">
          <Download size={16} /> Export
        </button>
      </div>

      {/* Role permissions matrix */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-swiss-red" />
          <h3 className="font-semibold text-ink">Role Permissions</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Object.keys(rolePermissions) as UserRole[]).map(role => (
            <div key={role} className="border border-surface-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-ink">{ROLE_LABELS[role]}</span>
                <Badge status="active" label={`${profiles.filter(p => p.role === role).length} users`} />
              </div>
              <ul className="space-y-1">
                {rolePermissions[role].map((perm, i) => (
                  <li key={i} className="text-xs text-ink-secondary flex items-start gap-1.5">
                    <span className="text-success mt-0.5">·</span> {perm}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-light">
              <tr className="text-left text-ink-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Phone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Created</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id} className="border-t border-surface-border hover:bg-surface-light transition-colors">
                  <td className="px-4 py-3 font-medium text-ink">{p.full_name}</td>
                  <td className="px-4 py-3 text-ink-secondary">{p.email}</td>
                  <td className="px-4 py-3"><Badge status="active" label={ROLE_LABELS[p.role as UserRole] ?? p.role} /></td>
                  <td className="px-4 py-3 text-ink-secondary hidden md:table-cell">{p.phone ?? '—'}</td>
                  <td className="px-4 py-3">{p.active ? <Badge status="active" /> : <Badge status="inactive" />}</td>
                  <td className="px-4 py-3 text-ink-secondary hidden lg:table-cell">{formatDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
