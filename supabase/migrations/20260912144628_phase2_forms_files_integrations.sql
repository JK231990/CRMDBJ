/*
# Phase 2 - Forms, Files, and Integrations Schema

## Overview
Adds tables for the Forms page (connected forms + submissions), Files page (file metadata), and Integrations page (connected external platforms).

## New Tables (4 total)
1. forms - Connected forms (Jotform or manual) with field mappings
2. form_submissions - Submissions received through forms, convertible to leads
3. files - File metadata for customer/order folder management
4. integrations - Connected external platform integrations (Google, WhatsApp, Meta, etc.)

## Security
- RLS enabled on ALL new tables
- Organisation-scoped access using get_current_user_org()
- 4 policies per table (SELECT/INSERT/UPDATE/DELETE), scoped TO authenticated
*/

-- ============================================================
-- 1. FORMS
-- ============================================================
CREATE TABLE IF NOT EXISTS forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  source text NOT NULL DEFAULT 'jotform',
  external_id text,
  status text DEFAULT 'active',
  field_mapping jsonb DEFAULT '{}'::jsonb,
  last_synced_at timestamptz,
  submission_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forms_org_id ON forms(organisation_id);

CREATE TRIGGER set_updated_at_forms BEFORE UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. FORM_SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  form_id uuid REFERENCES forms(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  raw_data jsonb DEFAULT '{}'::jsonb,
  mapped_data jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'new',
  source_name text,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_org_id ON form_submissions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON form_submissions(status);

-- ============================================================
-- 3. FILES
-- ============================================================
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  mime_type text,
  size_bytes bigint DEFAULT 0,
  storage_path text,
  thumbnail_url text,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  tags text[] DEFAULT '{}',
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_files_org_id ON files(organisation_id);
CREATE INDEX IF NOT EXISTS idx_files_customer_id ON files(customer_id);
CREATE INDEX IF NOT EXISTS idx_files_order_id ON files(order_id);
CREATE INDEX IF NOT EXISTS idx_files_type ON files(type);

-- ============================================================
-- 4. INTEGRATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  platform text NOT NULL,
  status text DEFAULT 'disconnected',
  account_name text,
  account_email text,
  connected_at timestamptz,
  last_synced_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integrations_org_id ON integrations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_integrations_platform ON integrations(platform);

CREATE TRIGGER set_updated_at_integrations BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ENABLE RLS ON ALL NEW TABLES
-- ============================================================
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES: FORMS
-- ============================================================
DROP POLICY IF EXISTS "select_forms_own_org" ON forms;
CREATE POLICY "select_forms_own_org" ON forms
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_forms_own_org" ON forms;
CREATE POLICY "insert_forms_own_org" ON forms
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_forms_own_org" ON forms;
CREATE POLICY "update_forms_own_org" ON forms
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_forms_own_org" ON forms;
CREATE POLICY "delete_forms_own_org" ON forms
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- ============================================================
-- POLICIES: FORM_SUBMISSIONS
-- ============================================================
DROP POLICY IF EXISTS "select_form_submissions_own_org" ON form_submissions;
CREATE POLICY "select_form_submissions_own_org" ON form_submissions
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_form_submissions_own_org" ON form_submissions;
CREATE POLICY "insert_form_submissions_own_org" ON form_submissions
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_form_submissions_own_org" ON form_submissions;
CREATE POLICY "update_form_submissions_own_org" ON form_submissions
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_form_submissions_own_org" ON form_submissions;
CREATE POLICY "delete_form_submissions_own_org" ON form_submissions
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- ============================================================
-- POLICIES: FILES
-- ============================================================
DROP POLICY IF EXISTS "select_files_own_org" ON files;
CREATE POLICY "select_files_own_org" ON files
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_files_own_org" ON files;
CREATE POLICY "insert_files_own_org" ON files
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_files_own_org" ON files;
CREATE POLICY "update_files_own_org" ON files
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_files_own_org" ON files;
CREATE POLICY "delete_files_own_org" ON files
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- ============================================================
-- POLICIES: INTEGRATIONS
-- ============================================================
DROP POLICY IF EXISTS "select_integrations_own_org" ON integrations;
CREATE POLICY "select_integrations_own_org" ON integrations
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_integrations_own_org" ON integrations;
CREATE POLICY "insert_integrations_own_org" ON integrations
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_integrations_own_org" ON integrations;
CREATE POLICY "update_integrations_own_org" ON integrations
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_integrations_own_org" ON integrations;
CREATE POLICY "delete_integrations_own_org" ON integrations
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());