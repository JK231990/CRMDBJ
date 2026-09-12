export function formatCurrency(amount: number, currency = 'CHF'): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-CH', opts ?? { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-CH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(date: string | Date | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

export function daysUntil(date: string | Date | null): number | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = d.getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export function initials(first: string, last: string): string {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

export function getLanguageLabel(code: string): string {
  const labels: Record<string, string> = {
    en: 'English', de: 'German', fr: 'French', it: 'Italian', ta: 'Tamil',
  };
  return labels[code] ?? code;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'badge-neutral',
    quotation: 'badge-neutral',
    awaiting_deposit: 'badge-warning',
    confirmed: 'badge-success',
    ordered_from_supplier: 'badge-warning',
    in_production: 'badge-warning',
    quality_control: 'badge-warning',
    ready_for_collection: 'badge-success',
    collected: 'badge-success',
    cancelled: 'badge-error',
    refunded: 'badge-error',
    new: 'badge-red',
    contacted: 'badge-warning',
    qualified: 'badge-warning',
    converted: 'badge-success',
    pending: 'badge-warning',
    in_progress: 'badge-warning',
    completed: 'badge-success',
    scheduled: 'badge-neutral',
    active: 'badge-success',
    inactive: 'badge-neutral',
    lead: 'badge-red',
  };
  return colors[status] ?? 'badge-neutral';
}

export function formatStatusLabel(status: string): string {
  return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
