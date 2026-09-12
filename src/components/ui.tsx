import { type ReactNode, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={cn('relative bg-white rounded-2xl shadow-modal w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in', sizes[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-light text-ink-muted hover:text-ink transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false, requireText = false }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  requireText?: boolean;
}) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (!open) setText('');
  }, [open]);
  const confirmed = !requireText || text === 'DELETE';

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-ink-secondary text-sm mb-4">{message}</p>
      {requireText && (
        <div className="mb-4">
          <p className="text-sm text-ink-secondary mb-2">Type <span className="font-mono font-bold text-ink">DELETE</span> to confirm:</p>
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="DELETE" />
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button
          className={danger ? 'btn-danger' : 'btn-primary'}
          disabled={!confirmed}
          onClick={() => { onConfirm(); onClose(); }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function EmptyState({ icon, title, description, action }: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-ink-muted mb-4">{icon}</div>}
      <h3 className="text-base font-medium text-ink mb-1">{title}</h3>
      {description && <p className="text-sm text-ink-secondary max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div className="inline-block animate-spin rounded-full border-2 border-surface-border border-t-swiss-red" style={{ width: size, height: size }} />
  );
}

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-light">
      <Spinner size={32} />
    </div>
  );
}

export function Badge({ status, label }: { status: string; label?: string }) {
  const colorClass = (() => {
    const colors: Record<string, string> = {
      draft: 'badge-neutral', quotation: 'badge-neutral', awaiting_deposit: 'badge-warning',
      confirmed: 'badge-success', ordered_from_supplier: 'badge-warning',
      in_production: 'badge-warning', quality_control: 'badge-warning',
      ready_for_collection: 'badge-success', collected: 'badge-success',
      cancelled: 'badge-error', refunded: 'badge-error',
      new: 'badge-red', contacted: 'badge-warning', qualified: 'badge-warning',
      converted: 'badge-success', pending: 'badge-warning', in_progress: 'badge-warning',
      completed: 'badge-success', scheduled: 'badge-neutral',
      active: 'badge-success', inactive: 'badge-neutral', lead: 'badge-red',
      connected: 'badge-success', disconnected: 'badge-neutral', demo: 'badge-warning',
      syncing: 'badge-warning', error: 'badge-error', action_required: 'badge-red',
    };
    return colors[status] ?? 'badge-neutral';
  })();

  const text = label ?? status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return <span className={colorClass}>{text}</span>;
}

export function Avatar({ firstName, lastName, url, size = 40 }: {
  firstName: string;
  lastName: string;
  url?: string | null;
  size?: number;
}) {
  if (url) {
    return <img src={url} alt={`${firstName} ${lastName}`} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  const init = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
  return (
    <div
      className="rounded-full bg-swiss-red-100 text-swiss-red flex items-center justify-center font-medium flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {init}
    </div>
  );
}
