import { useEffect, useState } from 'react';
import {
  Users, UserPlus, ShoppingCart, DollarSign, Clock, AlertCircle,
  Calendar, CheckSquare, TrendingUp, Download,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils';
import { Badge, Spinner, EmptyState } from '@/components/ui';
import { downloadCSV } from '@/lib/utils';
import type { Customer, Order, Task, Appointment, Lead, Profile } from '@/types';

interface DashboardData {
  totalCustomers: number;
  newLeads: number;
  activeCustomers: number;
  salesThisMonth: number;
  salesThisYear: number;
  avgOrderValue: number;
  openOrders: number;
  unpaidBalances: number;
  upcomingAppointments: Appointment[];
  followUpsDue: Task[];
  recentOrders: (Order & { customer?: Customer })[];
  recentTasks: (Task & { customer?: Customer })[];
  salesByMonth: { month: string; total: number }[];
  salesByCategory: { category: string; total: number }[];
  salesByKarat: { karat: string; total: number }[];
  salesByCity: { city: string; total: number }[];
  salesByEmployee: { name: string; total: number }[];
  customerLanguages: { language: string; count: number }[];
  customerCities: { city: string; count: number }[];
  leadSources: { source: string; count: number }[];
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

      const [customers, leads, orders, tasks, appointments, profilesData] = await Promise.all([
        supabase.from('customers').select('*').eq('deleted_at', null),
        supabase.from('leads').select('*'),
        supabase.from('orders').select('*, customer:customers(*)').eq('deleted_at', null),
        supabase.from('tasks').select('*, customer:customers(*)'),
        supabase.from('appointments').select('*, customer:customers(*)').gte('appointment_date', now.toISOString()).order('appointment_date', { ascending: true }).limit(5),
        supabase.from('profiles').select('*'),
      ]);

      const profileMap: Record<string, Profile> = {};
      (profilesData.data ?? []).forEach(p => { profileMap[p.id] = p as Profile; });

      const customerList = (customers.data ?? []) as Customer[];
      const leadList = (leads.data ?? []) as Lead[];
      const orderList = (orders.data ?? []) as (Order & { customer?: Customer })[];
      const taskList = (tasks.data ?? []) as (Task & { customer?: Customer })[];
      const appointmentList = (appointments.data ?? []) as Appointment[];

      const activeCustomers = customerList.filter(c => c.status === 'active');
      const newLeads = leadList.filter(l => l.status === 'new');
      const openOrders = orderList.filter(o => !['collected', 'cancelled', 'refunded'].includes(o.status));
      const unpaid = orderList.reduce((sum, o) => sum + (o.outstanding_balance || 0), 0);

      const monthOrders = orderList.filter(o => new Date(o.order_date) >= new Date(startOfMonth) && !['cancelled', 'refunded', 'draft'].includes(o.status));
      const yearOrders = orderList.filter(o => new Date(o.order_date) >= new Date(startOfYear) && !['cancelled', 'refunded', 'draft'].includes(o.status));

      const salesMonth = monthOrders.reduce((sum, o) => sum + o.total, 0);
      const salesYear = yearOrders.reduce((sum, o) => sum + o.total, 0);
      const avgOrder = yearOrders.length > 0 ? salesYear / yearOrders.length : 0;

      // Sales by month (last 8 months)
      const monthsData: Record<string, number> = {};
      for (let i = 7; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleDateString('en', { month: 'short' });
        monthsData[key] = 0;
      }
      orderList.forEach(o => {
        if (['cancelled', 'refunded', 'draft'].includes(o.status)) return;
        const d = new Date(o.order_date);
        const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        if (monthsAgo >= 0 && monthsAgo < 8) {
          const key = d.toLocaleDateString('en', { month: 'short' });
          if (key in monthsData) monthsData[key] += o.total;
        }
      });
      const salesByMonth = Object.entries(monthsData).map(([month, total]) => ({ month, total }));

      // Sales by category
      const catData: Record<string, number> = {};
      orderList.forEach(o => {
        if (['cancelled', 'refunded', 'draft'].includes(o.status)) return;
        const cat = o.order_items?.[0]?.category ?? 'Other';
        catData[cat] = (catData[cat] ?? 0) + o.total;
      });
      const salesByCategory = Object.entries(catData).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);

      // Sales by karat
      const karatData: Record<string, number> = {};
      orderList.forEach(o => {
        if (['cancelled', 'refunded', 'draft'].includes(o.status)) return;
        const items = o.order_items ?? [];
        items.forEach(item => {
          const k = item.karat ?? 'Other';
          karatData[k] = (karatData[k] ?? 0) + item.total;
        });
      });
      const salesByKarat = Object.entries(karatData).map(([karat, total]) => ({ karat, total })).sort((a, b) => b.total - a.total);

      // Sales by city
      const cityData: Record<string, number> = {};
      orderList.forEach(o => {
        if (['cancelled', 'refunded', 'draft'].includes(o.status)) return;
        const city = o.customer?.city ?? 'Unknown';
        cityData[city] = (cityData[city] ?? 0) + o.total;
      });
      const salesByCity = Object.entries(cityData).map(([city, total]) => ({ city, total })).sort((a, b) => b.total - a.total).slice(0, 6);

      // Sales by employee
      const empData: Record<string, number> = {};
      orderList.forEach(o => {
        if (['cancelled', 'refunded', 'draft'].includes(o.status)) return;
        if (o.assigned_employee_id) {
          const name = profileMap[o.assigned_employee_id]?.full_name ?? 'Unassigned';
          empData[name] = (empData[name] ?? 0) + o.total;
        }
      });
      const salesByEmployee = Object.entries(empData).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);

      // Customer languages
      const langData: Record<string, number> = {};
      customerList.forEach(c => {
        langData[c.preferred_language] = (langData[c.preferred_language] ?? 0) + 1;
      });
      const customerLanguages = Object.entries(langData).map(([language, count]) => ({ language, count })).sort((a, b) => b.count - a.count);

      // Customer cities
      const cCityData: Record<string, number> = {};
      customerList.forEach(c => {
        const city = c.city ?? 'Unknown';
        cCityData[city] = (cCityData[city] ?? 0) + 1;
      });
      const customerCities = Object.entries(cCityData).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count).slice(0, 6);

      // Lead sources
      const sourceData: Record<string, number> = {};
      leadList.forEach(l => {
        sourceData[l.source] = (sourceData[l.source] ?? 0) + 1;
      });
      const leadSources = Object.entries(sourceData).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);

      // Follow-ups due (tasks with due_date within next 7 days, pending)
      const followUpsDue = taskList.filter(t => {
        if (t.status !== 'pending') return false;
        if (!t.due_date) return false;
        const days = daysUntil(t.due_date);
        return days !== null && days <= 7;
      }).slice(0, 5);

      // Recent orders
      const recentOrders = [...orderList]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      setData({
        totalCustomers: customerList.length,
        newLeads: newLeads.length,
        activeCustomers: activeCustomers.length,
        salesThisMonth: salesMonth,
        salesThisYear: salesYear,
        avgOrderValue: avgOrder,
        openOrders: openOrders.length,
        unpaidBalances: unpaid,
        upcomingAppointments: appointmentList,
        followUpsDue,
        recentOrders,
        recentTasks: taskList.slice(0, 5),
        salesByMonth,
        salesByCategory,
        salesByKarat,
        salesByCity,
        salesByEmployee,
        customerLanguages,
        customerCities,
        leadSources,
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size={32} />
      </div>
    );
  }

  if (!data) {
    return <EmptyState title="Unable to load dashboard" description="Please try refreshing the page." />;
  }

  const maxMonth = Math.max(...data.salesByMonth.map(m => m.total), 1);
  const maxCat = Math.max(...data.salesByCategory.map(c => c.total), 1);
  const maxKarat = Math.max(...data.salesByKarat.map(k => k.total), 1);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Demo banner */}
      <div className="bg-swiss-red-50 border border-swiss-red-100 rounded-xl p-3 flex items-center gap-2 text-sm text-swiss-red">
        <AlertCircle size={16} />
        <span>All data shown is fictional demo data for demonstration purposes only.</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Total Customers" value={String(data.totalCustomers)} color="text-swiss-red" />
        <KpiCard icon={UserPlus} label="New Leads" value={String(data.newLeads)} color="text-warning" />
        <KpiCard icon={Users} label="Active Customers" value={String(data.activeCustomers)} color="text-success" />
        <KpiCard icon={DollarSign} label="Sales This Month" value={formatCurrency(data.salesThisMonth)} color="text-swiss-red" />
        <KpiCard icon={TrendingUp} label="Sales This Year" value={formatCurrency(data.salesThisYear)} color="text-success" />
        <KpiCard icon={ShoppingCart} label="Avg Order Value" value={formatCurrency(data.avgOrderValue)} color="text-ink-secondary" />
        <KpiCard icon={Clock} label="Open Orders" value={String(data.openOrders)} color="text-warning" />
        <KpiCard icon={AlertCircle} label="Unpaid Balances" value={formatCurrency(data.unpaidBalances)} color="text-error" />
      </div>

      {/* Sales chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-ink">Sales by Month</h3>
          <button
            onClick={() => downloadCSV('sales-by-month.csv', data.salesByMonth.map(m => ({ Month: m.month, Total: m.total })))}
            className="btn-ghost text-xs"
          >
            <Download size={14} /> Export
          </button>
        </div>
        <div className="flex items-end gap-2 h-48">
          {data.salesByMonth.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-surface-light rounded-t-lg relative group" style={{ height: '100%' }}>
                <div
                  className="absolute bottom-0 left-0 right-0 bg-swiss-red rounded-t-lg transition-all duration-500 hover:bg-swiss-red-dark"
                  style={{ height: `${(m.total / maxMonth) * 100}%` }}
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-ink whitespace-nowrap">
                    {formatCurrency(m.total, 'CHF')}
                  </div>
                </div>
              </div>
              <span className="text-xs text-ink-muted">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Two column: Sales by Category + Sales by Karat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-ink mb-4">Sales by Product Category</h3>
          <div className="space-y-3">
            {data.salesByCategory.map((c, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ink">{c.category}</span>
                  <span className="text-ink-secondary font-medium">{formatCurrency(c.total)}</span>
                </div>
                <div className="h-2 bg-surface-light rounded-full overflow-hidden">
                  <div className="h-full bg-swiss-red rounded-full transition-all duration-500" style={{ width: `${(c.total / maxCat) * 100}%` }} />
                </div>
              </div>
            ))}
            {data.salesByCategory.length === 0 && <p className="text-sm text-ink-muted">No data available</p>}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-ink mb-4">Sales by Karat</h3>
          <div className="space-y-3">
            {data.salesByKarat.map((k, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ink">{k.karat}</span>
                  <span className="text-ink-secondary font-medium">{formatCurrency(k.total)}</span>
                </div>
                <div className="h-2 bg-surface-light rounded-full overflow-hidden">
                  <div className="h-full bg-ink rounded-full transition-all duration-500" style={{ width: `${(k.total / maxKarat) * 100}%` }} />
                </div>
              </div>
            ))}
            {data.salesByKarat.length === 0 && <p className="text-sm text-ink-muted">No data available</p>}
          </div>
        </div>
      </div>

      {/* Sales by City + Customer Languages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-ink mb-4">Sales by City</h3>
          <div className="space-y-3">
            {data.salesByCity.map((c, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-ink">{c.city}</span>
                <span className="text-ink-secondary font-medium">{formatCurrency(c.total)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-ink mb-4">Customer Language Distribution</h3>
          <div className="flex flex-wrap gap-2">
            {data.customerLanguages.map((l, i) => (
              <div key={i} className="flex items-center gap-2 bg-surface-light rounded-xl px-3 py-1.5">
                <span className="text-sm font-medium text-ink">{l.language.toUpperCase()}</span>
                <span className="text-xs text-ink-muted">{l.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lead Sources + Sales by Employee */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-ink mb-4">Lead Source Performance</h3>
          <div className="space-y-2">
            {data.leadSources.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-ink capitalize">{s.source.replace(/_/g, ' ')}</span>
                <Badge status="new" label={`${s.count} leads`} />
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-ink mb-4">Sales by Employee</h3>
          <div className="space-y-2">
            {data.salesByEmployee.map((e, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-ink">{e.name}</span>
                <span className="text-ink-secondary font-medium">{formatCurrency(e.total)}</span>
              </div>
            ))}
            {data.salesByEmployee.length === 0 && <p className="text-sm text-ink-muted">No data</p>}
          </div>
        </div>
      </div>

      {/* Upcoming appointments + Follow-ups due */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-swiss-red" />
            <h3 className="font-semibold text-ink">Upcoming Appointments</h3>
          </div>
          <div className="space-y-3">
            {data.upcomingAppointments.length === 0 ? (
              <p className="text-sm text-ink-muted">No upcoming appointments</p>
            ) : (
              data.upcomingAppointments.map((apt) => (
                <div key={apt.id} className="flex items-start gap-3 py-2 border-b border-surface-border last:border-0">
                  <div className="w-10 h-10 bg-swiss-red-50 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-swiss-red">{new Date(apt.appointment_date).getDate()}</span>
                    <span className="text-[10px] text-swiss-red">{new Date(apt.appointment_date).toLocaleDateString('en', { month: 'short' })}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{apt.title}</p>
                    <p className="text-xs text-ink-muted">{apt.location} · {formatDate(apt.appointment_date, { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare size={18} className="text-swiss-red" />
            <h3 className="font-semibold text-ink">Follow-ups Due</h3>
          </div>
          <div className="space-y-3">
            {data.followUpsDue.length === 0 ? (
              <p className="text-sm text-ink-muted">No follow-ups due</p>
            ) : (
              data.followUpsDue.map((task) => {
                const days = daysUntil(task.due_date);
                return (
                  <div key={task.id} className="flex items-start gap-3 py-2 border-b border-surface-border last:border-0">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${days !== null && days <= 1 ? 'bg-error' : days !== null && days <= 3 ? 'bg-warning' : 'bg-success'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">{task.title}</p>
                      <p className="text-xs text-ink-muted">
                        {task.customer ? `${task.customer.first_name} ${task.customer.last_name} · ` : ''}
                        Due {formatDate(task.due_date)}
                      </p>
                    </div>
                    <Badge status={task.priority} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card p-5">
        <h3 className="font-semibold text-ink mb-4">Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left text-ink-muted">
                <th className="pb-2 font-medium">Order #</th>
                <th className="pb-2 font-medium">Customer</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-surface-border last:border-0 hover:bg-surface-light transition-colors">
                  <td className="py-2.5 font-medium text-ink">{order.order_number}</td>
                  <td className="py-2.5 text-ink-secondary">{order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : '—'}</td>
                  <td className="py-2.5 text-ink-secondary">{formatDate(order.order_date)}</td>
                  <td className="py-2.5"><Badge status={order.status} /></td>
                  <td className="py-2.5 text-right font-medium text-ink">{formatCurrency(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: {
  icon: typeof Users;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="card p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-muted font-medium">{label}</span>
        <Icon size={18} className={color} />
      </div>
      <span className="text-2xl font-bold text-ink">{value}</span>
    </div>
  );
}
