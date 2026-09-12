import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate, cn } from '@/lib/utils';
import { Badge, Spinner, EmptyState } from '@/components/ui';
import type { Appointment, Task } from '@/types';

export function Calendar() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [apptRes, taskRes] = await Promise.all([
      supabase.from('appointments').select('*, customer:customers(*)').order('appointment_date'),
      supabase.from('tasks').select('*').not('status', 'eq', 'completed'),
    ]);
    setAppointments(apptRes.data as Appointment[] ?? []);
    setTasks(taskRes.data as Task[] ?? []);
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Spinner size={32} /></div>;
  }

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday = 0

  const days: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));

  const getDayAppointments = (date: Date) => {
    return appointments.filter(a => {
      const ad = new Date(a.appointment_date);
      return ad.getDate() === date.getDate() && ad.getMonth() === date.getMonth() && ad.getFullYear() === date.getFullYear();
    });
  };

  const getDayTasks = (date: Date) => {
    return tasks.filter(t => {
      if (!t.due_date) return false;
      const td = new Date(t.due_date);
      return td.getDate() === date.getDate() && td.getMonth() === date.getMonth() && td.getFullYear() === date.getFullYear();
    });
  };

  const today = new Date();
  const isToday = (date: Date) => date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">Calendar</h2>
          <p className="text-sm text-ink-secondary">Appointments and task due dates</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="btn-secondary p-2">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-ink min-w-[120px] text-center">
            {currentMonth.toLocaleDateString('en', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="btn-secondary p-2">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-ink-muted py-2">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, i) => {
            if (!date) return <div key={i} className="aspect-square" />;
            const dayAppts = getDayAppointments(date);
            const dayTasks = getDayTasks(date);
            return (
              <div
                key={i}
                className={cn(
                  'aspect-square border border-surface-border rounded-lg p-1.5 overflow-hidden hover:bg-surface-light transition-colors cursor-pointer',
                  isToday(date) && 'border-swiss-red border-2'
                )}
              >
                <div className={cn('text-xs font-medium mb-1', isToday(date) ? 'text-swiss-red' : 'text-ink')}>
                  {date.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayAppts.slice(0, 2).map(a => (
                    <div key={a.id} className="text-[10px] bg-swiss-red-50 text-swiss-red rounded px-1 py-0.5 truncate">
                      {a.title}
                    </div>
                  ))}
                  {dayTasks.slice(0, 2).map(t => (
                    <div key={t.id} className="text-[10px] bg-warning-light text-warning rounded px-1 py-0.5 truncate">
                      {t.title}
                    </div>
                  ))}
                  {dayAppts.length + dayTasks.length > 4 && (
                    <div className="text-[10px] text-ink-muted">+{dayAppts.length + dayTasks.length - 4} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming list */}
      <div className="card p-5">
        <h3 className="font-semibold text-ink mb-4">Upcoming Appointments</h3>
        {appointments.filter(a => new Date(a.appointment_date) >= new Date()).length === 0 ? (
          <EmptyState icon={<CalIcon size={40} />} title="No upcoming appointments" />
        ) : (
          <div className="space-y-2">
            {appointments.filter(a => new Date(a.appointment_date) >= new Date()).slice(0, 10).map(apt => (
              <div key={apt.id} className="flex items-start gap-3 py-2 border-b border-surface-border last:border-0">
                <div className="w-10 h-10 bg-swiss-red-50 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-swiss-red">{new Date(apt.appointment_date).getDate()}</span>
                  <span className="text-[10px] text-swiss-red">{new Date(apt.appointment_date).toLocaleDateString('en', { month: 'short' })}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{apt.title}</p>
                  <p className="text-xs text-ink-muted">{apt.location} · {formatDate(apt.appointment_date, { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <Badge status={apt.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
