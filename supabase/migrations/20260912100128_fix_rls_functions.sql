/*
# Fix RLS Helper Functions and Profile Policies

## Problem
The get_current_user_org() and related functions lack an explicit search_path,
causing them to fail when invoked from RLS policies. This results in
"Database error querying schema" when users try to log in.

## Fix
1. Recreate all helper functions with SET search_path = public, auth
2. Simplify the profiles SELECT policy to use auth_user_id directly
   (avoids circular dependency: profile lookup needs org, org lookup needs profile)
3. Keep all other policies unchanged

## Security
- No changes to data or schema structure
- Only function definitions and profile SELECT policy are updated
*/

-- Fix helper functions with explicit search_path
CREATE OR REPLACE FUNCTION get_current_user_org()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT organisation_id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT role FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_current_user_profile_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Fix the handle_new_user trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
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
$$;

-- Fix profiles SELECT policy to avoid circular dependency
-- Use auth_user_id = auth.uid() for self-access (no function call needed)
-- Use a subquery for same-org access (avoids calling get_current_user_org on profiles)
DROP POLICY IF EXISTS "select_profiles_own_org" ON profiles;
CREATE POLICY "select_profiles_own_org" ON profiles
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR organisation_id = (
      SELECT p2.organisation_id FROM profiles p2
      WHERE p2.auth_user_id = auth.uid()
      LIMIT 1
    )
  );

-- Keep the other profiles policies
DROP POLICY IF EXISTS "insert_profiles_own_org" ON profiles;
CREATE POLICY "insert_profiles_own_org" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    organisation_id = (
      SELECT p2.organisation_id FROM profiles p2
      WHERE p2.auth_user_id = auth.uid()
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "update_profiles_own_or_org" ON profiles;
CREATE POLICY "update_profiles_own_or_org" ON profiles
  FOR UPDATE TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR organisation_id = (
      SELECT p2.organisation_id FROM profiles p2
      WHERE p2.auth_user_id = auth.uid()
      LIMIT 1
    )
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR organisation_id = (
      SELECT p2.organisation_id FROM profiles p2
      WHERE p2.auth_user_id = auth.uid()
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "delete_profiles_own_org" ON profiles;
CREATE POLICY "delete_profiles_own_org" ON profiles
  FOR DELETE TO authenticated
  USING (
    organisation_id = (
      SELECT p2.organisation_id FROM profiles p2
      WHERE p2.auth_user_id = auth.uid()
      LIMIT 1
    )
  );