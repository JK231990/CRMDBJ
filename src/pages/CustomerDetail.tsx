import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, Mail, Phone, MapPin, MessageCircle, Calendar, Tag,
  ShoppingCart, CreditCard, FileText, CheckSquare, Bot, Shield,
  Clock, X, Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  formatCurrency, formatDate, formatDateTime, timeAgo, getLanguageLabel,
  cn,
} from '@/lib/utils';
import { Badge, Avatar, Spinner, EmptyState } from '@/components/ui';
import type {
  Customer, Order, Payment, Task, Appointment,
  CustomerPreference, CustomerConsent, Profile,
} from '@/types';

type Tab = 'overview' | 'orders' | 'payments' | 'preferences' | 'appointments' | 'tasks' | 'consent' | 'activity';

const TABS: { id: Tab; label: string; icon: typeof ShoppingCart }[] = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'preferences', label: 'Preferences', icon: Tag },
  { id: 'appointments', label: 'Appointments', icon: Calendar },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'consent', label: 'Consent & Privacy', icon: Shield },
  { id: 'activity', label: 'Activity Timeline', icon: Clock },
];

export function CustomerDetail({ customerId, onBack }: { customerId: string; onBack: () => void }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [preferences, setPreferences] = useState<CustomerPreference[]>([]);
  const [consents, setConsents] = useState<CustomerConsent[]>([]);
  const [assignedEmployee, setAssignedEmployee] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  const loadCustomer = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cust } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .maybeSingle();

      if (cust) {
        setCustomer(cust as Customer);
        if ((cust as Customer).assigned_employee_id) {
          const { data: emp } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', (cust as Customer).assigned_employee_id!)
            .maybeSingle();
          setAssignedEmployee(emp as Profile | null);
        }
      }

      const [ordersRes, paymentsRes, tasksRes, apptsRes, prefsRes, consentsRes] = await Promise.all([
        supabase.from('orders').select('*').eq('customer_id', customerId).order('order_date', { ascending: false }),
        supabase.from('payments').select('*').eq('customer_id', customerId).order('payment_date', { ascending: false }),
        supabase.from('tasks').select('*').eq('customer_id', customerId).order('due_date', { ascending: true }),
        supabase.from('appointments').select('*').eq('customer_id', customerId).order('appointment_date', { ascending: true }),
        supabase.from('customer_preferences').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
        supabase.from('customer_consents').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
      ]);

      setOrders(ordersRes.data as Order[] ?? []);
      setPayments(paymentsRes.data as Payment[] ?? []);
      setTasks(tasksRes.data as Task[] ?? []);
      setAppointments(apptsRes.data as Appointment[] ?? []);
      setPreferences(prefsRes.data as CustomerPreference[] ?? []);
      setConsents(consentsRes.data as CustomerConsent[] ?? []);
    } catch (err) {
      console.error('Error loading customer:', err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Spinner size={32} /></div>;
  }

  if (!customer) {
    return <EmptyState title="Customer not found" description="This customer may have been deleted." />;
  }

  const totalPaid = payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1200px] mx-auto">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-ink-secondary hover:text-ink transition-colors">
        <ArrowLeft size={16} /> Back to Customers
      </button>

      {/* Customer header */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          <Avatar firstName={customer.first_name} lastName={customer.last_name} url={customer.avatar_url} size={72} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-ink">{customer.first_name} {customer.last_name}</h2>
              <Badge status={customer.status} />
              {customer.tags.map(tag => (
                <span key={tag} className="badge-neutral">{tag}</span>
              ))}
            </div>
            <p className="text-sm text-ink-muted mt-1">{customer.customer_code} · Customer since {formatDate(customer.created_at)}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-ink-secondary">
              {customer.email && <span className="flex items-center gap-1"><Mail size={14} /> {customer.email}</span>}
              {customer.phone && <span className="flex items-center gap-1"><Phone size={14} /> {customer.phone}</span>}
              {customer.whatsapp_number && <span className="flex items-center gap-1"><MessageCircle size={14} /> {customer.whatsapp_number}</span>}
              {customer.city && <span className="flex items-center gap-1"><MapPin size={14} /> {customer.city}, {customer.country}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="text-right">
              <p className="text-xs text-ink-muted">Lifetime Value</p>
              <p className="text-lg font-bold text-ink">{formatCurrency(customer.lifetime_value)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink-muted">Outstanding Balance</p>
              <p className={cn('text-lg font-bold', customer.outstanding_balance > 0 ? 'text-error' : 'text-ink')}>
                {formatCurrency(customer.outstanding_balance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-surface-border pb-px">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-swiss-red text-swiss-red'
                  : 'border-transparent text-ink-secondary hover:text-ink'
              )}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab customer={customer} orders={orders} payments={payments} preferences={preferences} assignedEmployee={assignedEmployee} totalPaid={totalPaid} />}
      {activeTab === 'orders' && <OrdersTab orders={orders} />}
      {activeTab === 'payments' && <PaymentsTab payments={payments} />}
      {activeTab === 'preferences' && <PreferencesTab preferences={preferences} onUpdate={loadCustomer} />}
      {activeTab === 'appointments' && <AppointmentsTab appointments={appointments} />}
      {activeTab === 'tasks' && <TasksTab tasks={tasks} onUpdate={loadCustomer} />}
      {activeTab === 'consent' && <ConsentTab customer={customer} consents={consents} onUpdate={loadCustomer} />}
      {activeTab === 'activity' && <ActivityTab orders={orders} payments={payments} tasks={tasks} consents={consents} />}
    </div>
  );
}

function OverviewTab({ customer, preferences, assignedEmployee, totalPaid }: {
  customer: Customer;
  orders: Order[];
  payments: Payment[];
  preferences: CustomerPreference[];
  assignedEmployee: Profile | null;
  totalPaid: number;
}) {
  const confirmedPrefs = preferences.filter(p => p.source !== 'ai_inferred');
  const aiPrefs = preferences.filter(p => p.source === 'ai_inferred');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="card p-5 space-y-3">
        <h3 className="font-semibold text-ink">Contact Information</h3>
        <InfoRow label="Email" value={customer.email} />
        <InfoRow label="Phone" value={customer.phone} />
        <InfoRow label="WhatsApp" value={customer.whatsapp_number} />
        <InfoRow label="Address" value={`${customer.address ?? ''}, ${customer.city ?? ''} ${customer.postal_code ?? ''}`} />
        <InfoRow label="Country" value={customer.country} />
        <InfoRow label="Date of Birth" value={customer.date_of_birth ? formatDate(customer.date_of_birth) : null} />
        <InfoRow label="Language" value={getLanguageLabel(customer.preferred_language)} />
        <InfoRow label="Preferred Channel" value={customer.preferred_channel} />
      </div>

      <div className="card p-5 space-y-3">
        <h3 className="font-semibold text-ink">Customer Details</h3>
        <InfoRow label="Customer Code" value={customer.customer_code} />
        <InfoRow label="Source" value={customer.customer_source} />
        <InfoRow label="Assigned Employee" value={assignedEmployee?.full_name ?? 'Unassigned'} />
        <InfoRow label="Status" value={<Badge status={customer.status} />} />
        <InfoRow label="Tags" value={customer.tags.length > 0 ? customer.tags.join(', ') : 'None'} />
        <InfoRow label="Total Purchases" value={String(customer.total_purchases)} />
        <InfoRow label="Store Credit" value={formatCurrency(customer.store_credit)} />
        <InfoRow label="Last Interaction" value={timeAgo(customer.last_interaction)} />
        <InfoRow label="Next Follow-up" value={customer.next_follow_up ? formatDate(customer.next_follow_up) : 'Not scheduled'} />
      </div>

      <div className="card p-5 space-y-3">
        <h3 className="font-semibold text-ink">Financial Summary</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-light rounded-xl p-3">
            <p className="text-xs text-ink-muted">Lifetime Value</p>
            <p className="text-lg font-bold text-ink">{formatCurrency(customer.lifetime_value)}</p>
          </div>
          <div className="bg-surface-light rounded-xl p-3">
            <p className="text-xs text-ink-muted">Total Paid</p>
            <p className="text-lg font-bold text-ink">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="bg-surface-light rounded-xl p-3">
            <p className="text-xs text-ink-muted">Outstanding</p>
            <p className="text-lg font-bold text-error">{formatCurrency(customer.outstanding_balance)}</p>
          </div>
          <div className="bg-surface-light rounded-xl p-3">
            <p className="text-xs text-ink-muted">Store Credit</p>
            <p className="text-lg font-bold text-ink">{formatCurrency(customer.store_credit)}</p>
          </div>
        </div>
        <div className="pt-2">
          <h4 className="text-sm font-medium text-ink mb-2">Quick Preferences</h4>
          <div className="flex flex-wrap gap-1.5">
            {confirmedPrefs.slice(0, 8).map(p => (
              <span key={p.id} className="badge-neutral">{p.category.replace(/_/g, ' ')}: {p.value}</span>
            ))}
            {aiPrefs.map(p => (
              <span key={p.id} className="badge-warning" title={`AI-inferred (${Math.round((p.confidence_score ?? 0) * 100)}% confidence)`}>
                {p.category.replace(/_/g, ' ')}: {p.value}
              </span>
            ))}
          </div>
        </div>
        {customer.notes && (
          <div className="pt-2">
            <h4 className="text-sm font-medium text-ink mb-1">Internal Notes</h4>
            <p className="text-sm text-ink-secondary bg-surface-light rounded-xl p-3">{customer.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-2 text-sm">
      <span className="text-ink-muted flex-shrink-0">{label}</span>
      <span className="text-ink text-right">{value ?? '—'}</span>
    </div>
  );
}

function OrdersTab({ orders }: { orders: Order[] }) {
  if (!orders.length) return <EmptyState icon={<ShoppingCart size={40} />} title="No orders yet" />;
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-light">
            <tr className="text-left text-ink-muted">
              <th className="px-4 py-3 font-medium">Order #</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3 font-medium text-right">Deposit</th>
              <th className="px-4 py-3 font-medium text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} className="border-t border-surface-border hover:bg-surface-light transition-colors">
                <td className="px-4 py-3 font-medium text-ink">{order.order_number}</td>
                <td className="px-4 py-3 text-ink-secondary">{formatDate(order.order_date)}</td>
                <td className="px-4 py-3"><Badge status={order.status} /></td>
                <td className="px-4 py-3 text-right font-medium text-ink">{formatCurrency(order.total)}</td>
                <td className="px-4 py-3 text-right text-ink-secondary">{formatCurrency(order.deposit)}</td>
                <td className="px-4 py-3 text-right">
                  {order.outstanding_balance > 0 ? (
                    <span className="text-error font-medium">{formatCurrency(order.outstanding_balance)}</span>
                  ) : (
                    <span className="text-success">Paid</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentsTab({ payments }: { payments: Payment[] }) {
  if (!payments.length) return <EmptyState icon={<CreditCard size={40} />} title="No payments recorded" />;
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-light">
            <tr className="text-left text-ink-muted">
              <th className="px-4 py-3 font-medium">Payment #</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(payment => (
              <tr key={payment.id} className="border-t border-surface-border hover:bg-surface-light transition-colors">
                <td className="px-4 py-3 font-medium text-ink">{payment.payment_number ?? '—'}</td>
                <td className="px-4 py-3 text-ink-secondary">{formatDate(payment.payment_date)}</td>
                <td className="px-4 py-3 text-ink-secondary capitalize">{payment.payment_method.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3"><Badge status={payment.status} /></td>
                <td className="px-4 py-3 text-right font-medium text-ink">{formatCurrency(payment.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PreferencesTab({ preferences, onUpdate }: { preferences: CustomerPreference[]; onUpdate: () => void }) {
  const handleApprove = async (id: string) => {
    await supabase.from('customer_preferences').update({ approved_at: new Date().toISOString(), rejected_at: null }).eq('id', id);
    onUpdate();
  };
  const handleReject = async (id: string) => {
    await supabase.from('customer_preferences').update({ rejected_at: new Date().toISOString() }).eq('id', id);
    onUpdate();
  };

  const sourceBadge = (source: string) => {
    if (source === 'customer_confirmed') return <span className="badge-success">Customer confirmed</span>;
    if (source === 'employee_entered') return <span className="badge-neutral">Employee entered</span>;
    if (source === 'ai_inferred') return <span className="badge-warning">AI inferred</span>;
    return <span className="badge-neutral">{source}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="font-semibold text-ink mb-4">Customer Preferences</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {preferences.filter(p => p.source !== 'ai_inferred').map(pref => (
            <div key={pref.id} className="border border-surface-border rounded-xl p-3">
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-medium text-ink">{pref.category.replace(/_/g, ' ')}</span>
                {sourceBadge(pref.source)}
              </div>
              <p className="text-sm text-ink-secondary">{pref.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bot size={18} className="text-warning" />
          <h3 className="font-semibold text-ink">AI-Inferred Preferences</h3>
        </div>
        {preferences.filter(p => p.source === 'ai_inferred').length === 0 ? (
          <p className="text-sm text-ink-muted">No AI-inferred preferences yet.</p>
        ) : (
          <div className="space-y-3">
            {preferences.filter(p => p.source === 'ai_inferred').map(pref => (
              <div key={pref.id} className="border border-surface-border rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-sm font-medium text-ink">{pref.category.replace(/_/g, ' ')}</span>
                    <p className="text-sm text-ink-secondary mt-1">{pref.value}</p>
                  </div>
                  {pref.approved_at ? (
                    <span className="badge-success">Approved</span>
                  ) : pref.rejected_at ? (
                    <span className="badge-error">Rejected</span>
                  ) : (
                    <div className="flex gap-1">
                      <button onClick={() => handleApprove(pref.id)} className="p-1.5 rounded-lg bg-success-light text-success hover:opacity-80 transition-opacity" title="Approve">
                        <Check size={16} />
                      </button>
                      <button onClick={() => handleReject(pref.id)} className="p-1.5 rounded-lg bg-error-light text-error hover:opacity-80 transition-opacity" title="Reject">
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-ink-muted">
                  <span>Provider: {pref.ai_provider ?? '—'}</span>
                  <span>Model: {pref.ai_model ?? '—'}</span>
                  <span>Confidence: {pref.confidence_score ? `${Math.round(pref.confidence_score * 100)}%` : '—'}</span>
                  <span>Created: {formatDate(pref.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AppointmentsTab({ appointments }: { appointments: Appointment[] }) {
  if (!appointments.length) return <EmptyState icon={<Calendar size={40} />} title="No appointments" />;
  return (
    <div className="space-y-3">
      {appointments.map(apt => (
        <div key={apt.id} className="card p-4 flex items-start gap-3">
          <div className="w-12 h-12 bg-swiss-red-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-swiss-red">{new Date(apt.appointment_date).getDate()}</span>
            <span className="text-[10px] text-swiss-red">{new Date(apt.appointment_date).toLocaleDateString('en', { month: 'short' })}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-ink">{apt.title}</p>
            {apt.description && <p className="text-sm text-ink-secondary mt-1">{apt.description}</p>}
            <div className="flex gap-3 mt-2 text-xs text-ink-muted">
              <span>{formatDateTime(apt.appointment_date)}</span>
              <span>{apt.duration_minutes} min</span>
              {apt.location && <span>{apt.location}</span>}
            </div>
          </div>
          <Badge status={apt.status} />
        </div>
      ))}
    </div>
  );
}

function TasksTab({ tasks, onUpdate }: { tasks: Task[]; onUpdate: () => void }) {
  const toggleStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    onUpdate();
  };

  if (!tasks.length) return <EmptyState icon={<CheckSquare size={40} />} title="No tasks" />;
  return (
    <div className="space-y-2">
      {tasks.map(task => (
        <div key={task.id} className="card p-4 flex items-start gap-3">
          <button
            onClick={() => toggleStatus(task)}
            className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
              task.status === 'completed' ? 'bg-success border-success' : 'border-surface-border hover:border-swiss-red'
            )}
          >
            {task.status === 'completed' && <Check size={12} className="text-white" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium', task.status === 'completed' ? 'text-ink-muted line-through' : 'text-ink')}>
              {task.title}
            </p>
            {task.description && <p className="text-xs text-ink-secondary mt-0.5">{task.description}</p>}
            <div className="flex gap-3 mt-1.5 text-xs text-ink-muted">
              <span>Due: {formatDate(task.due_date)}</span>
              <Badge status={task.priority} />
              <Badge status={task.status} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConsentTab({ customer, consents, onUpdate }: { customer: Customer; consents: CustomerConsent[]; onUpdate: () => void }) {
  const toggleConsent = async (type: 'marketing' | 'profiling') => {
    const current = type === 'marketing' ? customer.marketing_consent : customer.profiling_consent;
    const newValue = !current;
    await supabase.from('customers').update({ [type === 'marketing' ? 'marketing_consent' : 'profiling_consent']: newValue }).eq('id', customer.id);
    await supabase.from('customer_consents').insert({
      organisation_id: customer.organisation_id,
      customer_id: customer.id,
      consent_type: type,
      status: newValue ? 'granted' : 'withdrawn',
      granted_at: newValue ? new Date().toISOString() : null,
      withdrawn_at: newValue ? null : new Date().toISOString(),
      source: 'crm_manual',
    });
    onUpdate();
  };

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="font-semibold text-ink mb-4">Current Consent Status</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border border-surface-border rounded-xl">
            <div>
              <p className="text-sm font-medium text-ink">Marketing Consent</p>
              <p className="text-xs text-ink-muted">Customer agrees to receive marketing communications</p>
            </div>
            <button
              onClick={() => toggleConsent('marketing')}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors',
                customer.marketing_consent ? 'bg-success' : 'bg-surface-border'
              )}
            >
              <div className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform', customer.marketing_consent ? 'translate-x-6' : 'translate-x-0.5')} />
            </button>
          </div>
          <div className="flex items-center justify-between p-3 border border-surface-border rounded-xl">
            <div>
              <p className="text-sm font-medium text-ink">Profiling Consent</p>
              <p className="text-xs text-ink-muted">Customer agrees to AI analysis of their data</p>
            </div>
            <button
              onClick={() => toggleConsent('profiling')}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors',
                customer.profiling_consent ? 'bg-success' : 'bg-surface-border'
              )}
            >
              <div className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform', customer.profiling_consent ? 'translate-x-6' : 'translate-x-0.5')} />
            </button>
          </div>
        </div>
        <div className="mt-4 p-3 bg-surface-light rounded-xl">
          <p className="text-xs text-ink-muted">Privacy Status: <span className="font-medium text-ink">{customer.privacy_status}</span></p>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-ink mb-4">Consent History</h3>
        {consents.length === 0 ? (
          <p className="text-sm text-ink-muted">No consent history recorded.</p>
        ) : (
          <div className="space-y-3">
            {consents.map(consent => (
              <div key={consent.id} className="flex items-center gap-3 py-2 border-b border-surface-border last:border-0">
                <div className={cn('w-2 h-2 rounded-full', consent.status === 'granted' ? 'bg-success' : 'bg-error')} />
                <div className="flex-1">
                  <p className="text-sm text-ink">
                    <span className="font-medium capitalize">{consent.consent_type}</span> consent {consent.status}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {consent.granted_at ? `Granted ${formatDateTime(consent.granted_at)}` : ''}
                    {consent.withdrawn_at ? `Withdrawn ${formatDateTime(consent.withdrawn_at)}` : ''}
                    {consent.source ? ` · Source: ${consent.source}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityTab({ orders, payments, tasks, consents }: {
  orders: Order[];
  payments: Payment[];
  tasks: Task[];
  consents: CustomerConsent[];
}) {
  type Activity = { date: string; type: string; description: string; icon: typeof ShoppingCart };
  const activities: Activity[] = [
    ...orders.map(o => ({ date: o.created_at, type: 'order', description: `Order ${o.order_number} created (${formatCurrency(o.total)})`, icon: ShoppingCart })),
    ...payments.map(p => ({ date: p.created_at, type: 'payment', description: `Payment of ${formatCurrency(p.amount)} via ${p.payment_method}`, icon: CreditCard })),
    ...tasks.map(t => ({ date: t.created_at, type: 'task', description: `Task: ${t.title}`, icon: CheckSquare })),
    ...consents.map(c => ({ date: c.created_at, type: 'consent', description: `${c.consent_type} consent ${c.status}`, icon: Shield })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (!activities.length) return <EmptyState icon={<Clock size={40} />} title="No activity recorded" />;

  return (
    <div className="card p-5">
      <div className="space-y-4">
        {activities.map((activity, i) => {
          const Icon = activity.icon;
          return (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 bg-surface-light rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon size={14} className="text-ink-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink">{activity.description}</p>
                <p className="text-xs text-ink-muted">{formatDateTime(activity.date)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
