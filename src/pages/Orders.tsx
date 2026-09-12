import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Download, ShoppingCart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, downloadCSV } from '@/lib/utils';
import { Badge, Spinner, EmptyState, Modal } from '@/components/ui';
import type { Order, Customer, Profile } from '@/types';
import { useAuth } from '@/lib/auth';

export function Orders() {
  const [orders, setOrders] = useState<(Order & { customer?: Customer; assigned_employee?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('*, customer:customers(*), assigned_employee:profiles(*)')
      .is('deleted_at', null)
      .order('order_date', { ascending: false });

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data, error } = await query;
    if (error) console.error('Error loading orders:', error);
    else setOrders(data as (Order & { customer?: Customer; assigned_employee?: Profile })[]);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    loadOrders();
    supabase.from('customers').select('*').is('deleted_at', null).then(({ data }) => setCustomers(data as Customer[] ?? []));
  }, [loadOrders]);

  const filtered = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.order_number.toLowerCase().includes(q) ||
      o.customer?.first_name?.toLowerCase().includes(q) ||
      o.customer?.last_name?.toLowerCase().includes(q);
  });

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">Orders</h2>
          <p className="text-sm text-ink-secondary">{filtered.length} orders</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadCSV('orders.csv', filtered.map(o => ({
              OrderNumber: o.order_number, Customer: o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : '',
              Date: o.order_date, Status: o.status, Total: o.total, Deposit: o.deposit,
              Balance: o.outstanding_balance, PaymentMethod: o.payment_method ?? '',
            })))}
            className="btn-secondary"
          >
            <Download size={16} /> Export
          </button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> New Order
          </button>
        </div>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input pl-9" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-48" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="quotation">Quotation</option>
          <option value="awaiting_deposit">Awaiting Deposit</option>
          <option value="confirmed">Confirmed</option>
          <option value="ordered_from_supplier">Ordered from Supplier</option>
          <option value="in_production">In Production</option>
          <option value="quality_control">Quality Control</option>
          <option value="ready_for_collection">Ready for Collection</option>
          <option value="collected">Collected</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size={32} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<ShoppingCart size={48} />} title="No orders found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-light">
                <tr className="text-left text-ink-muted">
                  <th className="px-4 py-3 font-medium">Order #</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Date</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Employee</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr key={order.id} className="border-t border-surface-border hover:bg-surface-light transition-colors">
                    <td className="px-4 py-3 font-medium text-ink">{order.order_number}</td>
                    <td className="px-4 py-3 text-ink-secondary">
                      {order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-ink-secondary hidden md:table-cell">{formatDate(order.order_date)}</td>
                    <td className="px-4 py-3 text-ink-secondary hidden lg:table-cell">
                      {order.assigned_employee?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3"><Badge status={order.status} /></td>
                    <td className="px-4 py-3 text-right font-medium text-ink">{formatCurrency(order.total)}</td>
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
        )}
      </div>

      {showAdd && <AddOrderModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadOrders(); }} customers={customers} />}
    </div>
  );
}

function AddOrderModal({ onClose, onSaved, customers }: {
  onClose: () => void;
  onSaved: () => void;
  customers: Customer[];
}) {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    customer_id: '', order_number: '', status: 'draft',
    subtotal: 0, discount: 0, vat: 0, total: 0, deposit: 0,
    payment_method: '', notes: '', supplier: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const orgId = profile?.organisation_id;
    if (!orgId || !form.customer_id) {
      setError('Organisation and customer are required');
      setSaving(false);
      return;
    }

    const orderNum = form.order_number || `DJ-ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const total = form.subtotal - form.discount + form.vat;
    const outstanding = total - form.deposit;

    const { error } = await supabase.from('orders').insert({
      ...form,
      order_number: orderNum,
      organisation_id: orgId,
      order_date: new Date().toISOString().split('T')[0],
      total,
      outstanding_balance: outstanding,
      payment_method: form.payment_method || null,
      supplier: form.supplier || null,
      notes: form.notes || null,
      created_by: profile.id,
    });

    if (error) setError(error.message);
    else onSaved();
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title="Create New Order" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-error-light text-error text-sm rounded-xl p-3">{error}</div>}
        <div>
          <label className="label">Customer *</label>
          <select className="input" required value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
            <option value="">Select customer...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.customer_code})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Order Number</label>
            <input className="input" placeholder="Auto-generated" value={form.order_number} onChange={(e) => setForm({ ...form, order_number: e.target.value })} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="quotation">Quotation</option>
              <option value="awaiting_deposit">Awaiting Deposit</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Subtotal (CHF)</label>
            <input type="number" step="0.01" className="input" value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="label">Discount (CHF)</label>
            <input type="number" step="0.01" className="input" value={form.discount} onChange={(e) => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">VAT (CHF)</label>
            <input type="number" step="0.01" className="input" value={form.vat} onChange={(e) => setForm({ ...form, vat: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="label">Deposit (CHF)</label>
            <input type="number" step="0.01" className="input" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Payment Method</label>
            <select className="input" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
              <option value="">None</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="twint">TWINT</option>
              <option value="powerpay">PowerPay</option>
              <option value="american_express">American Express</option>
            </select>
          </div>
          <div>
            <label className="label">Supplier</label>
            <input className="input" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Spinner size={16} /> : 'Create Order'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
