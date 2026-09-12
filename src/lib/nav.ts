import {
  LayoutDashboard, Users, UserPlus, ShoppingCart, Package, CreditCard,
  MessageSquare, FileText, CheckSquare, Calendar, Megaphone, BarChart3,
  Bot, FolderOpen, Upload, Plug, UserCog, ScrollText, Settings,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
  phase: number;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, phase: 1 },
  { id: 'customers', label: 'Customers', icon: Users, phase: 1 },
  { id: 'leads', label: 'Leads', icon: UserPlus, phase: 1 },
  { id: 'orders', label: 'Orders', icon: ShoppingCart, phase: 1 },
  { id: 'products', label: 'Products', icon: Package, phase: 1 },
  { id: 'payments', label: 'Payments', icon: CreditCard, phase: 1 },
  { id: 'conversations', label: 'Conversations', icon: MessageSquare, phase: 3 },
  { id: 'forms', label: 'Forms', icon: FileText, phase: 2 },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, phase: 1 },
  { id: 'calendar', label: 'Calendar', icon: Calendar, phase: 1 },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone, phase: 5 },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, phase: 5 },
  { id: 'ai-assistant', label: 'AI Assistant', icon: Bot, phase: 4 },
  { id: 'files', label: 'Files', icon: FolderOpen, phase: 1 },
  { id: 'imports', label: 'Imports', icon: Upload, phase: 1 },
  { id: 'integrations', label: 'Integrations', icon: Plug, phase: 2 },
  { id: 'users', label: 'Users & Permissions', icon: UserCog, roles: ['super_admin', 'manager'], phase: 1 },
  { id: 'audit', label: 'Audit Log', icon: ScrollText, roles: ['super_admin', 'manager'], phase: 1 },
  { id: 'settings', label: 'Settings', icon: Settings, phase: 1 },
];

export const PHASE1_PAGES = NAV_ITEMS.filter(item => item.phase === 1).map(item => item.id);
