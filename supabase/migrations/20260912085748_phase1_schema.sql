/*
# Dubai Jewellery AI CRM - Phase 1 Schema

## Overview
Creates the complete database schema for the Dubai Jewellery AI CRM platform.
This migration sets up all core tables needed for Phase 1: authentication, 
customers, orders, payments, tasks, and supporting tables.

## New Tables (16 total)
1. organisations - Company/organisation records (multi-tenant root)
2. locations - Physical shop locations (Zürich, Geneva, etc.)
3. profiles - User profiles extending Supabase auth.users with roles
4. customers - Customer records with full CRM fields
5. customer_addresses - Multiple addresses per customer
6. customer_contacts - Multiple email/phone/whatsapp per customer
7. customer_preferences - Jewellery preferences (gold karat, diamond type, etc.)
8. customer_consents - Marketing/profiling consent history
9. leads - Lead tracking with source and status
10. products - Product catalog (rings, necklaces, etc.)
11. orders - Order records with full jewellery business fields
12. order_items - Line items per order
13. payments - Payment tracking (cash, card, TWINT, etc.)
14. appointments - Customer appointments
15. tasks - Tasks and follow-ups with priorities
16. audit_logs - Audit trail for all important actions

## Security
- RLS enabled on ALL tables
- Organisation-scoped access: users only see data from their own organisation
- Helper functions: get_current_user_org(), get_current_user_role(), get_current_user_profile_id()
- Auto-profile creation trigger on auth.users (assigns to first org, default role super_admin)
- All policies use auth.uid() - never current_user

## Notes
- All business tables include organisation_id for future multi-company support
- UUID primary keys throughout
- Soft deletion via deleted_at on customers, orders, products
- Audit columns: created_at, updated_at, created_by, updated_by
- updated_at auto-updated via triggers
*/

-- ============================================================
-- HELPER: updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. ORGANISATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  address text,
  city text,
  postal_code text,
  country text DEFAULT 'Switzerland',
  phone text,
  email text,
  vat_number text,
  currency text DEFAULT 'CHF',
  default_language text DEFAULT 'en',
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_updated_at_organisations BEFORE UPDATE ON organisations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. LOCATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  postal_code text,
  country text DEFAULT 'Switzerland',
  phone text,
  email text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_updated_at_locations BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  full_name text,
  first_name text,
  last_name text,
  role text NOT NULL DEFAULT 'sales_employee',
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  phone text,
  avatar_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  customer_code text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  preferred_name text,
  avatar_url text,
  email text,
  phone text,
  whatsapp_number text,
  address text,
  city text,
  postal_code text,
  country text DEFAULT 'Switzerland',
  date_of_birth date,
  preferred_language text DEFAULT 'en',
  preferred_channel text DEFAULT 'email',
  customer_source text DEFAULT 'walk_in',
  assigned_employee_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'active',
  tags text[] DEFAULT '{}',
  marketing_consent boolean DEFAULT false,
  profiling_consent boolean DEFAULT false,
  privacy_status text DEFAULT 'standard',
  lifetime_value numeric(12,2) DEFAULT 0,
  total_purchases integer DEFAULT 0,
  outstanding_balance numeric(12,2) DEFAULT 0,
  store_credit numeric(12,2) DEFAULT 0,
  last_interaction timestamptz,
  next_follow_up timestamptz,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TRIGGER set_updated_at_customers BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. CUSTOMER_ADDRESSES
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type text DEFAULT 'billing',
  address text,
  city text,
  postal_code text,
  country text DEFAULT 'Switzerland',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_updated_at_customer_addresses BEFORE UPDATE ON customer_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. CUSTOMER_CONTACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type text NOT NULL,
  value text NOT NULL,
  label text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_updated_at_customer_contacts BEFORE UPDATE ON customer_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 7. CUSTOMER_PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  category text NOT NULL,
  value text,
  source text DEFAULT 'customer_confirmed',
  confidence_score numeric(5,2),
  ai_provider text,
  ai_model text,
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_updated_at_customer_preferences BEFORE UPDATE ON customer_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 8. CUSTOMER_CONSENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  consent_type text NOT NULL,
  status text DEFAULT 'granted',
  granted_at timestamptz,
  withdrawn_at timestamptz,
  source text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_updated_at_customer_consents BEFORE UPDATE ON customer_consents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 9. LEADS
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'walk_in',
  status text DEFAULT 'new',
  priority text DEFAULT 'medium',
  assigned_employee_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  converted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TRIGGER set_updated_at_leads BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 10. PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  karat text,
  gold_color text,
  weight numeric(10,3),
  stone_type text,
  stone_price numeric(12,2) DEFAULT 0,
  making_charge numeric(12,2) DEFAULT 0,
  gold_rate numeric(12,2) DEFAULT 0,
  price numeric(12,2) DEFAULT 0,
  description text,
  image_url text,
  is_active boolean DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TRIGGER set_updated_at_products BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 11. ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  assigned_employee_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric(12,2) DEFAULT 0,
  discount numeric(12,2) DEFAULT 0,
  vat numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  deposit numeric(12,2) DEFAULT 0,
  outstanding_balance numeric(12,2) DEFAULT 0,
  payment_method text,
  due_date date,
  expected_delivery_date date,
  supplier text,
  notes text,
  customer_notes text,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TRIGGER set_updated_at_orders BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 12. ORDER_ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  category text,
  karat text,
  weight numeric(10,3),
  gold_rate numeric(12,2) DEFAULT 0,
  making_charge numeric(12,2) DEFAULT 0,
  stone_price numeric(12,2) DEFAULT 0,
  discount numeric(12,2) DEFAULT 0,
  vat numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER set_updated_at_order_items BEFORE UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 13. PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  payment_number text,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'CHF',
  payment_method text NOT NULL,
  reference text,
  status text DEFAULT 'completed',
  employee_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  attachment_url text,
  notes text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TRIGGER set_updated_at_payments BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 14. APPOINTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  appointment_date timestamptz NOT NULL,
  duration_minutes integer DEFAULT 60,
  location text,
  status text DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TRIGGER set_updated_at_appointments BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 15. TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  due_date date,
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  task_type text DEFAULT 'custom',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TRIGGER set_updated_at_tasks BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 16. AUDIT_LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- HELPER FUNCTIONS (SECURITY DEFINER for RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION get_current_user_org()
RETURNS uuid AS $$
  SELECT organisation_id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_profile_id()
RETURNS uuid AS $$
  SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGN-UP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (email, auth_user_id, role, organisation_id, full_name, first_name, last_name)
  VALUES (
    NEW.email,
    NEW.id,
    'super_admin',
    (SELECT id FROM organisations ORDER BY created_at LIMIT 1),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (email) DO UPDATE
    SET auth_user_id = NEW.id,
        updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES: ORGANISATIONS
-- ============================================================
DROP POLICY IF EXISTS "select_own_organisation" ON organisations;
CREATE POLICY "select_own_organisation" ON organisations
  FOR SELECT TO authenticated
  USING (id = get_current_user_org());

DROP POLICY IF EXISTS "update_own_organisation" ON organisations;
CREATE POLICY "update_own_organisation" ON organisations
  FOR UPDATE TO authenticated
  USING (id = get_current_user_org())
  WITH CHECK (id = get_current_user_org());

-- ============================================================
-- POLICIES: LOCATIONS
-- ============================================================
DROP POLICY IF EXISTS "select_locations_own_org" ON locations;
CREATE POLICY "select_locations_own_org" ON locations
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_locations_own_org" ON locations;
CREATE POLICY "insert_locations_own_org" ON locations
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_locations_own_org" ON locations;
CREATE POLICY "update_locations_own_org" ON locations
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_locations_own_org" ON locations;
CREATE POLICY "delete_locations_own_org" ON locations
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- ============================================================
-- POLICIES: PROFILES
-- ============================================================
DROP POLICY IF EXISTS "select_profiles_own_org" ON profiles;
CREATE POLICY "select_profiles_own_org" ON profiles
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org() OR auth_user_id = auth.uid());

DROP POLICY IF EXISTS "insert_profiles_own_org" ON profiles;
CREATE POLICY "insert_profiles_own_org" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_profiles_own_or_org" ON profiles;
CREATE POLICY "update_profiles_own_or_org" ON profiles
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org() OR auth_user_id = auth.uid())
  WITH CHECK (organisation_id = get_current_user_org() OR auth_user_id = auth.uid());

DROP POLICY IF EXISTS "delete_profiles_own_org" ON profiles;
CREATE POLICY "delete_profiles_own_org" ON profiles
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- ============================================================
-- POLICIES: CUSTOMERS
-- ============================================================
DROP POLICY IF EXISTS "select_customers_own_org" ON customers;
CREATE POLICY "select_customers_own_org" ON customers
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_customers_own_org" ON customers;
CREATE POLICY "insert_customers_own_org" ON customers
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_customers_own_org" ON customers;
CREATE POLICY "update_customers_own_org" ON customers
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_customers_own_org" ON customers;
CREATE POLICY "delete_customers_own_org" ON customers
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- ============================================================
-- POLICIES: CUSTOMER_ADDRESSES
-- ============================================================
DROP POLICY IF EXISTS "select_customer_addresses_own_org" ON customer_addresses;
CREATE POLICY "select_customer_addresses_own_org" ON customer_addresses
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_customer_addresses_own_org" ON customer_addresses;
CREATE POLICY "insert_customer_addresses_own_org" ON customer_addresses
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_customer_addresses_own_org" ON customer_addresses;
CREATE POLICY "update_customer_addresses_own_org" ON customer_addresses
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_customer_addresses_own_org" ON customer_addresses;
CREATE POLICY "delete_customer_addresses_own_org" ON customer_addresses
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- ============================================================
-- POLICIES: CUSTOMER_CONTACTS
-- ============================================================
DROP POLICY IF EXISTS "select_customer_contacts_own_org" ON customer_contacts;
CREATE POLICY "select_customer_contacts_own_org" ON customer_contacts
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_customer_contacts_own_org" ON customer_contacts;
CREATE POLICY "insert_customer_contacts_own_org" ON customer_contacts
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_customer_contacts_own_org" ON customer_contacts;
CREATE POLICY "update_customer_contacts_own_org" ON customer_contacts
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_customer_contacts_own_org" ON customer_contacts;
CREATE POLICY "delete_customer_contacts_own_org" ON customer_contacts
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- ============================================================
-- POLICIES: CUSTOMER_PREFERENCES
-- ============================================================
DROP POLICY IF EXISTS "select_customer_preferences_own_org" ON customer_preferences;
CREATE POLICY "select_customer_preferences_own_org" ON customer_preferences
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_customer_preferences_own_org" ON customer_preferences;
CREATE POLICY "insert_customer_preferences_own_org" ON customer_preferences
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_customer_preferences_own_org" ON customer_preferences;
CREATE POLICY "update_customer_preferences_own_org" ON customer_preferences
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_customer_preferences_own_org" ON customer_preferences;
CREATE POLICY "delete_customer_preferences_own_org" ON customer_preferences
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- ============================================================
-- POLICIES: CUSTOMER_CONSENTS
-- ============================================================
DROP POLICY IF EXISTS "select_customer_consents_own_org" ON customer_consents;
CREATE POLICY "select_customer_consents_own_org" ON customer_consents
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_customer_consents_own_org" ON customer_consents;
CREATE POLICY "insert_customer_consents_own_org" ON customer_consents
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_customer_consents_own_org" ON customer_consents;
CREATE POLICY "update_customer_consents_own_org" ON customer_consents
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_customer_consents_own_org" ON customer_consents;
CREATE POLICY "delete_customer_consents_own_org" ON customer_consents
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- ============================================================
-- POLICIES: LEADS
-- ============================================================
DROP POLICY IF EXISTS "select_leads_own_org" ON leads;
CREATE POLICY "select_leads_own_org" ON leads
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_leads_own_org" ON leads;
CREATE POLICY "insert_leads_own_org" ON leads
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_leads_own_org" ON leads;
CREATE POLICY "update_leads_own_org" ON leads
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_leads_own_org" ON leads;
CREATE POLICY "delete_leads_own_org" ON leads
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- ============================================================
-- POLICIES: PRODUCTS
-- ============================================================
DROP POLICY IF EXISTS "select_products_own_org" ON products;
CREATE POLICY "select_products_own_org" ON products
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_products_own_org" ON products;
CREATE POLICY "insert_products_own_org" ON products
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_products_own_org" ON products;
CREATE POLICY "update_products_own_org" ON products
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_products_own_org" ON products;
CREATE POLICY "delete_products_own_org" ON products
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- ============================================================
-- POLICIES: ORDERS
-- ============================================================
DROP POLICY IF EXISTS "select_orders_own_org" ON orders;
CREATE POLICY "select_orders_own_org" ON orders
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_orders_own_org" ON orders;
CREATE POLICY "insert_orders_own_org" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_orders_own_org" ON orders;
CREATE POLICY "update_orders_own_org" ON orders
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_orders_own_org" ON orders;
CREATE POLICY "delete_orders_own_org" ON orders
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- ============================================================
-- POLICIES: ORDER_ITEMS
-- ============================================================
DROP POLICY IF EXISTS "select_order_items_own_org" ON order_items;
CREATE POLICY "select_order_items_own_org" ON order_items
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_order_items_own_org" ON order_items;
CREATE POLICY "insert_order_items_own_org" ON order_items
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_order_items_own_org" ON order_items;
CREATE POLICY "update_order_items_own_org" ON order_items
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_order_items_own_org" ON order_items;
CREATE POLICY "delete_order_items_own_org" ON order_items
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- ============================================================
-- POLICIES: PAYMENTS
-- ============================================================
DROP POLICY IF EXISTS "select_payments_own_org" ON payments;
CREATE POLICY "select_payments_own_org" ON payments
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_payments_own_org" ON payments;
CREATE POLICY "insert_payments_own_org" ON payments
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_payments_own_org" ON payments;
CREATE POLICY "update_payments_own_org" ON payments
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_payments_own_org" ON payments;
CREATE POLICY "delete_payments_own_org" ON payments
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- ============================================================
-- POLICIES: APPOINTMENTS
-- ============================================================
DROP POLICY IF EXISTS "select_appointments_own_org" ON appointments;
CREATE POLICY "select_appointments_own_org" ON appointments
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_appointments_own_org" ON appointments;
CREATE POLICY "insert_appointments_own_org" ON appointments
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_appointments_own_org" ON appointments;
CREATE POLICY "update_appointments_own_org" ON appointments
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_appointments_own_org" ON appointments;
CREATE POLICY "delete_appointments_own_org" ON appointments
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- ============================================================
-- POLICIES: TASKS
-- ============================================================
DROP POLICY IF EXISTS "select_tasks_own_org" ON tasks;
CREATE POLICY "select_tasks_own_org" ON tasks
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_tasks_own_org" ON tasks;
CREATE POLICY "insert_tasks_own_org" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_tasks_own_org" ON tasks;
CREATE POLICY "update_tasks_own_org" ON tasks
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_tasks_own_org" ON tasks;
CREATE POLICY "delete_tasks_own_org" ON tasks
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- ============================================================
-- POLICIES: AUDIT_LOGS
-- ============================================================
DROP POLICY IF EXISTS "select_audit_logs_own_org" ON audit_logs;
CREATE POLICY "select_audit_logs_own_org" ON audit_logs
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_audit_logs_own_org" ON audit_logs;
CREATE POLICY "insert_audit_logs_own_org" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON customers(organisation_id);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_emp ON customers(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);
CREATE INDEX IF NOT EXISTS idx_orders_org_id ON orders(organisation_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_org_id ON payments(organisation_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON tasks(organisation_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(organisation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(organisation_id);
CREATE INDEX IF NOT EXISTS idx_leads_org_id ON leads(organisation_id);
CREATE INDEX IF NOT EXISTS idx_products_org_id ON products(organisation_id);
CREATE INDEX IF NOT EXISTS idx_appointments_org_id ON appointments(organisation_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_customer_prefs_customer_id ON customer_preferences(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_consents_customer_id ON customer_consents(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);