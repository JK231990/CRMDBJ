/*
# Fix Infinite Recursion in Profiles RLS Policy

## Problem
The profiles SELECT policy uses a subquery on profiles itself:
  organisation_id = (SELECT p2.organisation_id FROM profiles p2 WHERE p2.auth_user_id = auth.uid())
Since RLS is enabled on profiles, this subquery triggers the same RLS policy,
creating infinite recursion. PostgreSQL detects this and errors with
"Database error querying schema", breaking login.

## Fix
Replace the subquery with get_current_user_org() which is a SECURITY DEFINER
function that bypasses RLS. The function already has SET search_path = public, auth
so it works correctly.

## Security
- No data changes
- Only the profiles SELECT/INSERT/UPDATE/DELETE policies are updated
- get_current_user_org() is SECURITY DEFINER, bypasses RLS safely
*/

-- Fix profiles SELECT policy - use function instead of subquery to avoid recursion
DROP POLICY IF EXISTS "select_profiles_own_org" ON profiles;
CREATE POLICY "select_profiles_own_org" ON profiles
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR organisation_id = get_current_user_org()
  );

-- Fix profiles INSERT policy
DROP POLICY IF EXISTS "insert_profiles_own_org" ON profiles;
CREATE POLICY "insert_profiles_own_org" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

-- Fix profiles UPDATE policy
DROP POLICY IF EXISTS "update_profiles_own_or_org" ON profiles;
CREATE POLICY "update_profiles_own_or_org" ON profiles
  FOR UPDATE TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR organisation_id = get_current_user_org()
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR organisation_id = get_current_user_org()
  );

-- Fix profiles DELETE policy
DROP POLICY IF EXISTS "delete_profiles_own_org" ON profiles;
CREATE POLICY "delete_profiles_own_org" ON profiles
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- Also fix organisations policy to use function (already done, but verify)
DROP POLICY IF EXISTS "select_own_organisation" ON organisations;
CREATE POLICY "select_own_organisation" ON organisations
  FOR SELECT TO authenticated
  USING (id = get_current_user_org());

DROP POLICY IF EXISTS "update_own_organisation" ON organisations;
CREATE POLICY "update_own_organisation" ON organisations
  FOR UPDATE TO authenticated
  USING (id = get_current_user_org())
  WITH CHECK (id = get_current_user_org());