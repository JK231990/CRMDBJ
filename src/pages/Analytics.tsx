import { useEffect, useState } from 'react';
import {
  TrendingUp, Users, ShoppingCart, DollarSign, Download,
  Repeat, Clock, Award, Target, Percent,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, downloadCSV } from '@/lib/utils';
import { Spinner, EmptyState } from '@/components/ui';
import type { Customer, Order, Lead, Payment, Product, Profile, Task } from '@/types';

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  repeatPurchaseRate: number;
  conversionRate: number;
  avgCustomerLifetime: number;
  topCustomers: { name: string; total: number; orders: number }[];
  salesTrend: { month: string; revenue: number; orders: number }[];
  productPerformance: { name: string; category: string; revenue: number; units: number }[];
  paymentMethodBreakdown: { method: string; count: number; total: number }[];
  employeePerformance: { name: string; revenue: number; orders: number; customers: number }[];
  leadConversion: { source: string; total: number; converted: number; rate: number }[];
  customerGrowth: { month: string; new: number; cumulative: number }[];
  taskCompletion: { total: number; completed: number; rate: number };
  revenueByKarat: { karat: string; revenue: number }[];
}

export function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [customersRes, ordersRes, leadsRes, paymentsRes, productsRes, profilesRes, tasksRes] = await Promise.all([
        supabase.from('customers').select('*').is('deleted_at', null),
        supabase.from('orders').select('*, customer:customers(*), assigned_employee:profiles(*)').is('deleted_at', null),
        supabase.from('leads').select('*'),
        supabase.from('payments').select('*, customer:customers(*)'),
        supabase.from('products').select('*').is('deleted_at', null),
        supabase.from('profiles').select('*'),
        supabase.from('tasks').select('*'),
      ]);

      const customers = (customersRes.data ?? []) as Customer[];
      const orders = (ordersRes.data ?? []) as (Order & { customer?: Customer; assigned_employee?: Profile })[];
      const leads = (leadsRes.data ?? []) as Lead[];
      const payments = (paymentsRes.data ?? []) as (Payment & { customer?: Customer })[];
      const products = (productsRes.data ?? []) as Product[];
      const profiles = (profilesRes.data ?? []) as Profile[];
      const tasks = (tasksRes.data ?? []) as Task[];

      const profileMap: Record<string, Profile> = {};
      profiles.forEach(p => { profileMap[p.id] = p; });

      const validOrders = orders.filter(o => !['cancelled', 'refunded', 'draft'].includes(o.status));
      const totalRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);
      const totalOrders = validOrders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Repeat purchase rate
      const customerOrderCounts: Record<string, number> = {};
      validOrders.forEach(o => { customerOrderCounts[o.customer_id] = (customerOrderCounts[o.customer_id] ?? 0) + 1; });
      const repeatCustomers = Object.values(customerOrderCounts).filter(c => c > 1).length;
      const repeatPurchaseRate = customers.length > 0 ? Math.round((repeatCustomers / customers.length) * 100) : 0;

      // Lead conversion rate
      const convertedLeads = leads.filter(l => l.status === 'converted').length;
      const conversionRate = leads.length > 0 ? Math.round((convertedLeads / leads.length) * 100) : 0;

      // Avg customer lifetime (days from first to last order)
      const customerOrderDates: Record<string, Date[]> = {};
      validOrders.forEach(o => {
        if (!customerOrderDates[o.customer_id]) customerOrderDates[o.customer_id] = [];
        customerOrderDates[o.customer_id].push(new Date(o.order_date));
      });
      let totalLifetimeDays = 0;
      let lifetimeCount = 0;
      Object.values(customerOrderDates).forEach(dates => {
        if (dates.length > 1) {
          dates.sort((a, b) => a.getTime() - b.getTime());
          const days = (dates[dates.length - 1].getTime() - dates[0].getTime()) / 86400000;
          totalLifetimeDays += days;
          lifetimeCount++;
        }
      });
      const avgCustomerLifetime = lifetimeCount > 0 ? Math.round(totalLifetimeDays / lifetimeCount) : 0;

      // Top customers by LTV
      const customerSpend: Record<string, { total: number; orders: number }> = {};
      validOrders.forEach(o => {
        if (!customerSpend[o.customer_id]) customerSpend[o.customer_id] = { total: 0, orders: 0 };
        customerSpend[o.customer_id].total += o.total;
        customerSpend[o.customer_id].orders += 1;
      });
      const topCustomers = Object.entries(customerSpend)
        .map(([id, { total, orders }]) => {
          const c = customers.find(c => c.id === id);
          return { name: c ? `${c.first_name} ${c.last_name}` : 'Unknown', total, orders };
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      // Sales trend (12 months)
      const now = new Date();
      const monthsData: Record<string, { revenue: number; orders: number }> = {};
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
        monthsData[key] = { revenue: 0, orders: 0 };
      }
      validOrders.forEach(o => {
        const d = new Date(o.order_date);
        const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        if (monthsAgo >= 0 && monthsAgo < 12) {
          const key = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
          if (key in monthsData) {
            monthsData[key].revenue += o.total;
            monthsData[key].orders += 1;
          }
        }
      });
      const salesTrend = Object.entries(monthsData).map(([month, v]) => ({ month, revenue: v.revenue, orders: v.orders }));

      // Product performance
      const productPerf: Record<string, { name: string; category: string; revenue: number; units: number }> = {};
      orders.forEach(o => {
        if (['cancelled', 'refunded', 'draft'].includes(o.status)) return;
        const items = o.order_items ?? [];
        items.forEach(item => {
          const key = item.product_id ?? item.product_name;
          if (!productPerf[key]) productPerf[key] = { name: item.product_name, category: item.category ?? 'Other', revenue: 0, units: 0 };
          productPerf[key].revenue += item.total;
          productPerf[key].units += 1;
        });
      });
      const productPerformance = Object.values(productPerf).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

      // Payment method breakdown
      const payMethodData: Record<string, { count: number; total: number }> = {};
      payments.forEach(p => {
        if (!payMethodData[p.payment_method]) payMethodData[p.payment_method] = { count: 0, total: 0 };
        payMethodData[p.payment_method].count += 1;
        payMethodData[p.payment_method].total += p.amount;
      });
      const paymentMethodBreakdown = Object.entries(payMethodData).map(([method, v]) => ({ method, ...v })).sort((a, b) => b.total - a.total);

      // Employee performance
      const empPerf: Record<string, { revenue: number; orders: number; customers: Set<string> }> = {};
      validOrders.forEach(o => {
        if (!o.assigned_employee_id) return;
        const eid = o.assigned_employee_id;
        if (!empPerf[eid]) empPerf[eid] = { revenue: 0, orders: 0, customers: new Set() };
        empPerf[eid].revenue += o.total;
        empPerf[eid].orders += 1;
        empPerf[eid].customers.add(o.customer_id);
      });
      const employeePerformance = Object.entries(empPerf).map(([id, v]) => ({
        name: profileMap[id]?.full_name ?? 'Unknown',
        revenue: v.revenue,
        orders: v.orders,
        customers: v.customers.size,
      })).sort((a, b) => b.revenue - a.revenue);

      // Lead conversion by source
      const leadBySource: Record<string, { total: number; converted: number }> = {};
      leads.forEach(l => {
        if (!leadBySource[l.source]) leadBySource[l.source] = { total: 0, converted: 0 };
        leadBySource[l.source].total += 1;
        if (l.status === 'converted') leadBySource[l.source].converted += 1;
      });
      const leadConversion = Object.entries(leadBySource).map(([source, v]) => ({
        source, total: v.total, converted: v.converted, rate: v.total > 0 ? Math.round((v.converted / v.total) * 100) : 0,
      })).sort((a, b) => b.rate - a.rate);

      // Customer growth
      const growthData: Record<string, { new: number; cumulative: number }> = {};
      let cumulative = 0;
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleDateString('en', { month: 'short' });
        growthData[key] = { new: 0, cumulative: 0 };
      }
      const sortedCustomers = [...customers].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      sortedCustomers.forEach(c => {
        const d = new Date(c.created_at);
        const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        if (monthsAgo >= 0 && monthsAgo < 12) {
          const key = d.toLocaleDateString('en', { month: 'short' });
          if (key in growthData) growthData[key].new += 1;
        }
      });
      Object.entries(growthData).forEach(([month, v]) => {
        cumulative += v.new;
        v.cumulative = cumulative;
      });
      const customerGrowth = Object.entries(growthData).map(([month, v]) => ({ month, new: v.new, cumulative: v.cumulative }));

      // Task completion
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const taskCompletion = { total: totalTasks, completed: completedTasks, rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0 };

      // Revenue by karat
      const karatRev: Record<string, number> = {};
      orders.forEach(o => {
        if (['cancelled', 'refunded', 'draft'].includes(o.status)) return;
        const items = o.order_items ?? [];
        items.forEach(item => {
          const k = item.karat ?? 'Other';
          karatRev[k] = (karatRev[k] ?? 0) + item.total;
        });
      });
      const revenueByKarat = Object.entries(karatRev).map(([karat, revenue]) => ({ karat, revenue })).sort((a, b) => b.revenue - a.revenue);

      setData({
        totalRevenue, totalOrders, avgOrderValue, repeatPurchaseRate,
        conversionRate, avgCustomerLifetime, topCustomers, salesTrend,
        productPerformance, paymentMethodBreakdown, employeePerformance,
        leadConversion, customerGrowth, taskCompletion, revenueByKarat,
      });
    } catch (err) {
      console.error('Analytics load error:', err);
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
    return <EmptyState title="Unable to load analytics" description="Please try refreshing the page." />;
  }

  const maxRevenue = Math.max(...data.salesTrend.map(m => m.revenue), 1);
  const maxGrowth = Math.max(...data.customerGrowth.map(m => m.cumulative), 1);
  const maxEmpRev = Math.max(...data.employeePerformance.map(e => e.revenue), 1);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">Analytics</h2>
          <p className="text-sm text-ink-secondary">Advanced insights and performance metrics</p>
        </div>
        <button onClick={() => downloadCSV('analytics-summary.csv', [{
          TotalRevenue: data.totalRevenue, TotalOrders: data.totalOrders,
          AvgOrderValue: data.avgOrderValue, RepeatPurchaseRate: data.repeatPurchaseRate,
          ConversionRate: data.conversionRate, TaskCompletionRate: data.taskCompletion.rate,
        }])} className="btn-secondary">
          <Download size={16} /> Export
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard icon={DollarSign} label="Total Revenue" value={formatCurrency(data.totalRevenue)} />
        <KpiCard icon={ShoppingCart} label="Total Orders" value={String(data.totalOrders)} />
        <KpiCard icon={TrendingUp} label="Avg Order Value" value={formatCurrency(data.avgOrderValue)} />
        <KpiCard icon={Repeat} label="Repeat Rate" value={`${data.repeatPurchaseRate}%`} />
        <KpiCard icon={Target} label="Lead Conversion" value={`${data.conversionRate}%`} />
        <KpiCard icon={Clock} label="Avg Lifetime" value={`${data.avgCustomerLifetime}d`} />
      </div>

      {/* Revenue trend */}
      <div className="card p-5">
        <h3 className="font-semibold text-ink mb-4">Revenue & Order Trend (12 months)</h3>
        <div className="flex items-end gap-1.5 h-48">
          {data.salesTrend.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-surface-light rounded-t-lg relative group" style={{ height: '100%' }}>
                <div
                  className="absolute bottom-0 left-0 right-0 bg-swiss-red rounded-t-lg transition-all duration-500 hover:bg-swiss-red-dark"
                  style={{ height: `${(m.revenue / maxRevenue) * 100}%` }}
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-medium text-ink whitespace-nowrap">
                    {formatCurrency(m.revenue)}
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-ink-muted whitespace-nowrap">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Growth + Revenue by Karat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-ink mb-4">Customer Growth</h3>
          <div className="flex items-end gap-1.5 h-40">
            {data.customerGrowth.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-surface-light rounded-t-lg relative" style={{ height: '100%' }}>
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-success rounded-t-lg transition-all duration-500"
                    style={{ height: `${(m.cumulative / maxGrowth) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-ink-muted">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-ink mb-4">Revenue by Gold Karat</h3>
          <div className="space-y-3">
            {data.revenueByKarat.map((k, i) => {
              const maxK = Math.max(...data.revenueByKarat.map(x => x.revenue), 1);
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-ink">{k.karat}</span>
                    <span className="text-ink-secondary font-medium">{formatCurrency(k.revenue)}</span>
                  </div>
                  <div className="h-2 bg-surface-light rounded-full overflow-hidden">
                    <div className="h-full bg-swiss-red rounded-full transition-all duration-500" style={{ width: `${(k.revenue / maxK) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {data.revenueByKarat.length === 0 && <p className="text-sm text-ink-muted">No data available</p>}
          </div>
        </div>
      </div>

      {/* Employee Performance + Lead Conversion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award size={18} className="text-swiss-red" />
            <h3 className="font-semibold text-ink">Employee Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-ink-muted">
                  <th className="pb-2 font-medium">Employee</th>
                  <th className="pb-2 font-medium text-right">Revenue</th>
                  <th className="pb-2 font-medium text-right">Orders</th>
                  <th className="pb-2 font-medium text-right">Customers</th>
                </tr>
              </thead>
              <tbody>
                {data.employeePerformance.map((e, i) => (
                  <tr key={i} className="border-b border-surface-border last:border-0">
                    <td className="py-2.5 text-ink">{e.name}</td>
                    <td className="py-2.5 text-right font-medium text-ink">{formatCurrency(e.revenue)}</td>
                    <td className="py-2.5 text-right text-ink-secondary">{e.orders}</td>
                    <td className="py-2.5 text-right text-ink-secondary">{e.customers}</td>
                  </tr>
                ))}
                {data.employeePerformance.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-ink-muted">No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} className="text-swiss-red" />
            <h3 className="font-semibold text-ink">Lead Conversion by Source</h3>
          </div>
          <div className="space-y-3">
            {data.leadConversion.map((l, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ink capitalize">{l.source.replace(/_/g, ' ')}</span>
                  <span className="text-ink-secondary font-medium">{l.converted}/{l.total} ({l.rate}%)</span>
                </div>
                <div className="h-2 bg-surface-light rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full transition-all duration-500" style={{ width: `${l.rate}%` }} />
                </div>
              </div>
            ))}
            {data.leadConversion.length === 0 && <p className="text-sm text-ink-muted">No data</p>}
          </div>
        </div>
      </div>

      {/* Top Customers + Product Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-swiss-red" />
            <h3 className="font-semibold text-ink">Top Customers by Value</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-ink-muted">
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium text-right">Total Spent</th>
                  <th className="pb-2 font-medium text-right">Orders</th>
                </tr>
              </thead>
              <tbody>
                {data.topCustomers.map((c, i) => (
                  <tr key={i} className="border-b border-surface-border last:border-0">
                    <td className="py-2.5 text-ink">{c.name}</td>
                    <td className="py-2.5 text-right font-medium text-ink">{formatCurrency(c.total)}</td>
                    <td className="py-2.5 text-right text-ink-secondary">{c.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award size={18} className="text-swiss-red" />
            <h3 className="font-semibold text-ink">Top Products by Revenue</h3>
          </div>
          <div className="space-y-2">
            {data.productPerformance.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <span className="text-ink truncate block">{p.name}</span>
                  <span className="text-xs text-ink-muted">{p.category} · {p.units} sold</span>
                </div>
                <span className="text-ink-secondary font-medium flex-shrink-0 ml-2">{formatCurrency(p.revenue)}</span>
              </div>
            ))}
            {data.productPerformance.length === 0 && <p className="text-sm text-ink-muted">No data</p>}
          </div>
        </div>
      </div>

      {/* Payment Methods + Task Completion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-ink mb-4">Payment Method Breakdown</h3>
          <div className="space-y-2">
            {data.paymentMethodBreakdown.map((p, i) => {
              const maxPay = Math.max(...data.paymentMethodBreakdown.map(x => x.total), 1);
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-ink capitalize">{p.method.replace(/_/g, ' ')}</span>
                    <span className="text-ink-secondary font-medium">{formatCurrency(p.total)} ({p.count})</span>
                  </div>
                  <div className="h-2 bg-surface-light rounded-full overflow-hidden">
                    <div className="h-full bg-ink rounded-full transition-all duration-500" style={{ width: `${(p.total / maxPay) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {data.paymentMethodBreakdown.length === 0 && <p className="text-sm text-ink-muted">No data</p>}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Percent size={18} className="text-swiss-red" />
            <h3 className="font-semibold text-ink">Task Completion Rate</h3>
          </div>
          <div className="flex items-center justify-center py-4">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#E5E5E5" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40" fill="none" stroke="#DC2626" strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 40 * data.taskCompletion.rate / 100} ${2 * Math.PI * 40}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-ink">{data.taskCompletion.rate}%</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-ink-secondary text-center">
            {data.taskCompletion.completed} of {data.taskCompletion.total} tasks completed
          </p>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-muted font-medium">{label}</span>
        <Icon size={16} className="text-swiss-red" />
      </div>
      <span className="text-xl font-bold text-ink">{value}</span>
    </div>
  );
}
