export type UserRole = 'super_admin' | 'manager' | 'sales_employee' | 'marketing_employee' | 'accountant';

export interface Profile {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  organisation_id: string | null;
  location_id: string | null;
  phone: string | null;
  avatar_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Organisation {
  id: string;
  name: string;
  legal_name: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  email: string | null;
  vat_number: string | null;
  currency: string;
  default_language: string;
  logo_url: string | null;
}

export interface Location {
  id: string;
  organisation_id: string;
  name: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
}

export interface Customer {
  id: string;
  organisation_id: string;
  customer_code: string | null;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  date_of_birth: string | null;
  preferred_language: string;
  preferred_channel: string;
  customer_source: string;
  assigned_employee_id: string | null;
  status: string;
  tags: string[];
  marketing_consent: boolean;
  profiling_consent: boolean;
  privacy_status: string;
  lifetime_value: number;
  total_purchases: number;
  outstanding_balance: number;
  store_credit: number;
  last_interaction: string | null;
  next_follow_up: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  assigned_employee?: Profile | null;
}

export interface CustomerPreference {
  id: string;
  customer_id: string;
  category: string;
  value: string;
  source: string;
  confidence_score: number | null;
  ai_provider: string | null;
  ai_model: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
}

export interface CustomerConsent {
  id: string;
  customer_id: string;
  consent_type: string;
  status: string;
  granted_at: string | null;
  withdrawn_at: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
}

export interface CustomerContact {
  id: string;
  customer_id: string;
  type: string;
  value: string;
  label: string | null;
  is_primary: boolean;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  type: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  is_default: boolean;
}

export interface Product {
  id: string;
  organisation_id: string;
  name: string;
  category: string;
  karat: string | null;
  gold_color: string | null;
  weight: number | null;
  stone_type: string | null;
  stone_price: number;
  making_charge: number;
  gold_rate: number;
  price: number;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  organisation_id: string;
  order_number: string;
  customer_id: string;
  location_id: string | null;
  assigned_employee_id: string | null;
  order_date: string;
  status: string;
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  deposit: number;
  outstanding_balance: number;
  payment_method: string | null;
  due_date: string | null;
  expected_delivery_date: string | null;
  supplier: string | null;
  notes: string | null;
  customer_notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer | null;
  assigned_employee?: Profile | null;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  category: string | null;
  karat: string | null;
  weight: number | null;
  gold_rate: number;
  making_charge: number;
  stone_price: number;
  discount: number;
  vat: number;
  total: number;
  notes: string | null;
}

export interface Payment {
  id: string;
  organisation_id: string;
  payment_number: string | null;
  customer_id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  payment_method: string;
  reference: string | null;
  status: string;
  employee_id: string | null;
  attachment_url: string | null;
  notes: string | null;
  payment_date: string;
  created_at: string;
  customer?: Customer | null;
  order?: Order | null;
}

export interface Appointment {
  id: string;
  organisation_id: string;
  customer_id: string;
  employee_id: string | null;
  title: string;
  description: string | null;
  appointment_date: string;
  duration_minutes: number;
  location: string | null;
  status: string;
  customer?: Customer | null;
  employee?: Profile | null;
}

export interface Task {
  id: string;
  organisation_id: string;
  customer_id: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  task_type: string;
  created_at: string;
  customer?: Customer | null;
  assignee?: Profile | null;
}

export interface Lead {
  id: string;
  organisation_id: string;
  customer_id: string | null;
  source: string;
  status: string;
  priority: string;
  assigned_employee_id: string | null;
  notes: string | null;
  converted_at: string | null;
  created_at: string;
  customer?: Customer | null;
  assigned_employee?: Profile | null;
}

export interface AuditLog {
  id: string;
  organisation_id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user?: Profile | null;
}

export const ORDER_STATUSES = [
  'draft', 'quotation', 'awaiting_deposit', 'confirmed', 'ordered_from_supplier',
  'in_production', 'quality_control', 'ready_for_collection', 'collected',
  'cancelled', 'refunded'
] as const;

export const PAYMENT_METHODS = [
  'cash', 'card', 'bank_transfer', 'twint', 'powerpay',
  'american_express', 'old_gold_credit', 'store_credit', 'order_deposit', 'other'
] as const;

export const LANGUAGES: Record<string, string> = {
  en: 'English',
  de: 'German',
  fr: 'French',
  it: 'Italian',
  ta: 'Tamil',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  sales_employee: 'Sales Employee',
  marketing_employee: 'Marketing Employee',
  accountant: 'Accountant',
};
