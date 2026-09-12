import { useEffect, useState, useCallback } from 'react';
import { Search, Download, CreditCard, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, downloadCSV } from '@/lib/utils';
import { Badge, Spinner, EmptyState, Modal } from '@/components/ui';
import type { Payment, Customer, Order } from '@/types';
import { useAuth } from '@/lib/auth';

export function Payments() {
  const [payments, setPayments] = useState<(Payment & { customer?: Customer; order?: Order })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('payments')
      .select('*, customer:customers(*), order:orders(*)')
      .order('payment_date', { ascending: false });

    if (methodFilter !== 'all') query = query.eq('payment_method', methodFilter);
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data, error } = await query;
    if (error) console.error('Error loading payments:', error);
    else setPayments(data as (Payment & { customer?: Customer; order?: Order })[]);
    setLoading(false);
  }, [methodFilter, statusFilter]);

  useEffect(() => {
    loadPayments();
    supabase.from('customers').select('*').is('deleted_at', null).then(({ data }) => setCustomers(data as Customer[] ?? []));
    supabase.from('orders').select('*').then(({ data }) => setOrders(data as Order[] ?? []));
  }, [loadPayments]);

  const filtered = payments.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.payment_number?.toLowerCase().includes(q) ||
      p.customer?.first_name?.toLowerCase().includes(q) ||
      p.customer?.last_name?.toLowerCase().includes(q) ||
      p.reference?.toLowerCase().includes(q);
  });

  const totalCompleted = payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">Payments</h2>
          <p className="text-sm text-ink-secondary">{filtered.length} payments · {formatCurrency(totalCompleted)} completed · {formatCurrency(totalPending)} pending</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadCSV('payments.csv', filtered.map(p => ({
            PaymentNumber: p.payment_number, Customer: p.customer ? `${p.customer.first_name} ${p.customer.last_name}` : '',
            Date: p.payment_date, Method: p.payment_method, Status: p.status, Amount: p.amount, Reference: p.reference ?? '',
          })))} className="btn-secondary">
            <Download size={16} /> Export
          </button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Record Payment
          </button>
        </div>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input pl-9" placeholder="Search payments..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-40" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
          <option value="all">All Methods</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="twint">TWINT</option>
          <option value="powerpay">PowerPay</option>
          <option value="american_express">Amex</option>
          <option value="old_gold_credit">Old Gold Credit</option>
          <option value="store_credit">Store Credit</option>
          <option value="other">Other</option>
        </select>
        <select className="input sm:w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size={32} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<CreditCard size={48} />} title="No payments found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-light">
                <tr className="text-left text-ink-muted">
                  <th className="px-4 py-3 font-medium">Payment #</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Date</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Method</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Reference</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(payment => (
                  <tr key={payment.id} className="border-t border-surface-border hover:bg-surface-light transition-colors">
                    <td className="px-4 py-3 font-medium text-ink">{payment.payment_number ?? '—'}</td>
                    <td className="px-4 py-3 text-ink-secondary">
                      {payment.customer ? `${payment.customer.first_name} ${payment.customer.last_name}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-ink-secondary hidden md:table-cell">{formatDate(payment.payment_date)}</td>
                    <td className="px-4 py-3 text-ink-secondary hidden lg:table-cell capitalize">{payment.payment_method.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-ink-muted hidden lg:table-cell">{payment.reference ?? '—'}</td>
                    <td className="px-4 py-3"><Badge status={payment.status} /></td>
                    <td className="px-4 py-3 text-right font-medium text-ink">{formatCurrency(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddPaymentModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadPayments(); }} customers={customers} orders={orders} />}
    </div>
  );
}

function AddPaymentModal({ onClose, onSaved, customers, orders }: {
  onClose: () => void; onSaved: () => void;
  customers: Customer[]; orders: Order[];
}) {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    customer_id: '', order_id: '', amount: 0, payment_method: 'cash',
    reference: '', status: 'completed', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerOrders = orders.filter(o => o.customer_id === form.customer_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const orgId = profile?.organisation_id;
    if (!orgId || !form.customer_id) { setError('Organisation and customer required'); setSaving(false); return; }
    const payNum = `DJ-PAY-${String(Date.now()).slice(-4)}`;
    const { error } = await supabase.from('payments').insert({
      ...form,
      payment_number: payNum,
      organisation_id: orgId,
      order_id: form.order_id || null,
      payment_date: new Date().toISOString().split('T')[0],
      employee_id: profile.id,
      created_by: profile.id,
      notes: form.notes || null,
      reference: form.reference || null,
    });
    if (error) setError(error.message);
    else onSaved();
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title="Record Payment" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-error-light text-error text-sm rounded-xl p-3">{error}</div>}
        <div>
          <label className="label">Customer *</label>
          <select className="input" required value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value, order_id: '' })}>
            <option value="">Select customer...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Order (optional)</label>
          <select className="input" value={form.order_id} onChange={(e) => setForm({ ...form, order_id: e.target.value })}>
            <option value="">No linked order</option>
            {customerOrders.map(o => <option key={o.id} value={o.id}>{o.order_number} ({formatCurrency(o.total)})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Amount (CHF) *</label>
            <input type="number" step="0.01" className="input" required value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select className="input" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="twint">TWINT</option>
              <option value="powerpay">PowerPay</option>
              <option value="american_express">American Express</option>
              <option value="old_gold_credit">Old Gold Credit</option>
              <option value="store_credit">Store Credit</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Reference</label>
            <input className="input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Spinner size={16} /> : 'Record Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
