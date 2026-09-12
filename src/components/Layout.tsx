import { useState, type ReactNode } from 'react';
import { Menu, LogOut, Bell, Search, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { NAV_ITEMS } from '@/lib/nav';
import { ROLE_LABELS, type UserRole } from '@/types';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';

interface LayoutProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  children: ReactNode;
}

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const role = profile?.role ?? 'sales_employee';
  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.roles && !item.roles.includes(role as UserRole)) return false;
    return true;
  });

  const currentLabel = NAV_ITEMS.find(item => item.id === currentPage)?.label ?? 'Dashboard';
  const searchResults = globalSearch.trim()
    ? visibleItems.filter(item => item.label.toLowerCase().includes(globalSearch.trim().toLowerCase())).slice(0, 6)
    : [];

  const navigateFromSearch = (page: string) => {
    onNavigate(page);
    setGlobalSearch('');
  };

  return (
    <div className="flex h-screen bg-surface-light overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-surface-border flex flex-col transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-border h-16">
          <div className="w-9 h-9 bg-swiss-red rounded-xl flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink truncate">Dubai Jewellery</p>
            <p className="text-xs text-ink-muted">AI CRM</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-swiss-red text-white'
                    : 'text-ink-secondary hover:bg-surface-light hover:text-ink'
                )}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.phase > 1 && (
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                    active ? 'bg-white/20 text-white' : 'bg-surface-light text-ink-muted'
                  )}>
                    P{item.phase}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User info */}
        <div className="border-t border-surface-border p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar
              firstName={profile?.first_name ?? ''}
              lastName={profile?.last_name ?? ''}
              url={profile?.avatar_url}
              size={36}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink truncate">{profile?.full_name ?? 'User'}</p>
              <p className="text-xs text-ink-muted">{ROLE_LABELS[role as UserRole] ?? role}</p>
            </div>
            <button
              onClick={signOut}
              className="p-2 rounded-lg text-ink-muted hover:bg-surface-light hover:text-ink transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-surface-border flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-surface-light text-ink"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold text-ink">{currentLabel}</h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden md:block w-64">
              <div className="flex items-center gap-2 bg-surface-light rounded-xl px-3 py-1.5">
                <Search size={16} className="text-ink-muted" />
                <input
                  className="bg-transparent text-sm outline-none flex-1 placeholder:text-ink-muted"
                  placeholder="Search pages..."
                  value={globalSearch}
                  onChange={(event) => setGlobalSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && searchResults[0]) navigateFromSearch(searchResults[0].id);
                    if (event.key === 'Escape') setGlobalSearch('');
                  }}
                />
              </div>
              {globalSearch.trim() && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-modal border border-surface-border p-1 z-50">
                  {searchResults.length ? searchResults.map(item => (
                    <button key={item.id} onClick={() => navigateFromSearch(item.id)} className="w-full text-left px-3 py-2 rounded-lg text-sm text-ink-secondary hover:bg-surface-light hover:text-ink">
                      {item.label}
                    </button>
                  )) : <p className="px-3 py-2 text-sm text-ink-muted">No matching page</p>}
                </div>
              )}
            </div>
            <div className="relative">
              <button onClick={() => setNotificationsOpen(!notificationsOpen)} className="p-2 rounded-lg hover:bg-surface-light text-ink-secondary transition-colors relative" title="Notifications">
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-swiss-red rounded-full" />
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-xl shadow-modal border border-surface-border p-4 z-50">
                  <p className="text-sm font-semibold text-ink">Notifications</p>
                  <p className="text-sm text-ink-secondary mt-2">Open Tasks to review follow-ups and overdue reminders.</p>
                  <button onClick={() => { onNavigate('tasks'); setNotificationsOpen(false); }} className="btn-secondary text-xs mt-3 w-full">View tasks</button>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setUserMenu(!userMenu)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-surface-light transition-colors"
              >
                <Avatar
                  firstName={profile?.first_name ?? ''}
                  lastName={profile?.last_name ?? ''}
                  url={profile?.avatar_url}
                  size={32}
                />
                <ChevronDown size={16} className="text-ink-muted" />
              </button>
              {userMenu && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-modal border border-surface-border py-2 animate-scale-in z-50">
                  <div className="px-4 py-2 border-b border-surface-border">
                    <p className="text-sm font-medium text-ink">{profile?.full_name}</p>
                    <p className="text-xs text-ink-muted">{profile?.email}</p>
                  </div>
                  <button
                    onClick={() => { onNavigate('settings'); setUserMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-ink-secondary hover:bg-surface-light hover:text-ink transition-colors"
                  >
                    Settings
                  </button>
                  <button
                    onClick={signOut}
                    className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error-light transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
