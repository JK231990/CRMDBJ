import { useEffect, useState, useCallback } from 'react';
import { Plus, CheckSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate, daysUntil, cn } from '@/lib/utils';
import { Badge, Spinner, EmptyState, Modal } from '@/components/ui';
import type { Task, Customer, Profile } from '@/types';
import { useAuth } from '@/lib/auth';

export function Tasks() {
  const [tasks, setTasks] = useState<(Task & { customer?: Customer; assignee?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('tasks')
      .select('*, customer:customers(*), assignee:profiles(*)')
      .order('due_date', { ascending: true });

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (priorityFilter !== 'all') query = query.eq('priority', priorityFilter);

    const { data, error } = await query;
    if (error) console.error('Error loading tasks:', error);
    else setTasks(data as (Task & { customer?: Customer; assignee?: Profile })[]);
    setLoading(false);
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    loadTasks();
    supabase.from('customers').select('*').is('deleted_at', null).then(({ data }) => setCustomers(data as Customer[] ?? []));
    supabase.from('profiles').select('*').then(({ data }) => setProfiles(data as Profile[] ?? []));
  }, [loadTasks]);

  const toggleStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    loadTasks();
  };

  const pending = tasks.filter(t => t.status === 'pending');
  const completed = tasks.filter(t => t.status === 'completed');
  const overdue = pending.filter(t => {
    const days = daysUntil(t.due_date);
    return days !== null && days < 0;
  });

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">Tasks & Follow-ups</h2>
          <p className="text-sm text-ink-secondary">
            {pending.length} pending · {overdue.length} overdue · {completed.length} completed
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-warning">{pending.length}</p>
          <p className="text-xs text-ink-muted">Pending</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-error">{overdue.length}</p>
          <p className="text-xs text-ink-muted">Overdue</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-success">{completed.length}</p>
          <p className="text-xs text-ink-muted">Completed</p>
        </div>
      </div>

      <div className="card p-4 flex gap-3">
        <select className="input flex-1" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <select className="input flex-1" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="all">All Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner size={32} /></div>
      ) : tasks.length === 0 ? (
        <EmptyState icon={<CheckSquare size={48} />} title="No tasks found" />
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const days = daysUntil(task.due_date);
            const isOverdue = days !== null && days < 0 && task.status !== 'completed';
            return (
              <div key={task.id} className={cn('card p-4 flex items-start gap-3', isOverdue && 'border-l-4 border-l-error')}>
                <button
                  onClick={() => toggleStatus(task)}
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
                    task.status === 'completed' ? 'bg-success border-success' : 'border-surface-border hover:border-swiss-red'
                  )}
                >
                  {task.status === 'completed' && <CheckSquare size={12} className="text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', task.status === 'completed' ? 'text-ink-muted line-through' : 'text-ink')}>
                    {task.title}
                  </p>
                  {task.description && <p className="text-xs text-ink-secondary mt-0.5">{task.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {task.customer && (
                      <span className="text-xs text-ink-muted">
                        {task.customer.first_name} {task.customer.last_name}
                      </span>
                    )}
                    {task.assignee && (
                      <span className="text-xs text-ink-muted">· {task.assignee.full_name}</span>
                    )}
                    <span className={cn('text-xs', isOverdue ? 'text-error font-medium' : 'text-ink-muted')}>
                      · Due {formatDate(task.due_date)}
                      {isOverdue && ` (${Math.abs(days!)} days overdue)`}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <Badge status={task.priority} />
                  <Badge status={task.status} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadTasks(); }} customers={customers} profiles={profiles} />}
    </div>
  );
}

function AddTaskModal({ onClose, onSaved, customers, profiles }: {
  onClose: () => void; onSaved: () => void;
  customers: Customer[]; profiles: Profile[];
}) {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    customer_id: '', assigned_to: '', title: '', description: '',
    due_date: '', priority: 'medium', task_type: 'custom',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const orgId = profile?.organisation_id;
    if (!orgId) { setError('No organisation found'); setSaving(false); return; }
    const { error } = await supabase.from('tasks').insert({
      ...form,
      organisation_id: orgId,
      customer_id: form.customer_id || null,
      assigned_to: form.assigned_to || null,
      due_date: form.due_date || null,
      status: 'pending',
      created_by: profile.id,
    });
    if (error) setError(error.message);
    else onSaved();
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title="New Task" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-error-light text-error text-sm rounded-xl p-3">{error}</div>}
        <div>
          <label className="label">Title *</label>
          <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Customer</label>
            <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">No customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Assign To</label>
            <select className="input" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
              <option value="">Unassigned</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Due Date</label>
            <input type="date" className="input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })}>
              <option value="custom">Custom</option>
              <option value="follow_up">Follow-up</option>
              <option value="reminder">Reminder</option>
              <option value="payment_reminder">Payment Reminder</option>
              <option value="order_reminder">Order Reminder</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Spinner size={16} /> : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
