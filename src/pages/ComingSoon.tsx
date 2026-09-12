import { type LucideIcon } from 'lucide-react';

export function ComingSoon({ title, phase, icon: Icon, description }: {
  title: string;
  phase: number;
  icon: LucideIcon;
  description: string;
}) {
  return (
    <div className="p-4 lg:p-6 max-w-[800px] mx-auto">
      <div className="card p-8 text-center">
        <div className="w-16 h-16 bg-swiss-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Icon size={32} className="text-swiss-red" />
        </div>
        <h2 className="text-xl font-bold text-ink mb-2">{title}</h2>
        <p className="text-sm text-ink-secondary mb-4 max-w-md mx-auto">{description}</p>
        <div className="inline-flex items-center gap-2 bg-surface-light rounded-xl px-4 py-2">
          <span className="text-sm font-medium text-ink">Phase {phase}</span>
          <span className="text-xs text-ink-muted">— Coming in a future update</span>
        </div>
      </div>
    </div>
  );
}
