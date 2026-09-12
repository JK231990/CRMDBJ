/*
# Fix Organisations SELECT Policy

## Problem
The organisations SELECT policy calls get_current_user_org() which queries
the profiles table. But profiles SELECT policy also depends on knowing
the organisation. This circular dependency can cause login failures.

## Fix
Replace the function call with an inline subquery that looks up the
organisation directly from the profiles table using auth.uid().
This breaks the circular dependency.
*/

DROP POLICY IF EXISTS "select_own_organisation" ON organisations;
CREATE POLICY "select_own_organisation" ON organisations
  FOR SELECT TO authenticated
  USING (
    id = (
      SELECT p.organisation_id FROM profiles p
      WHERE p.auth_user_id = auth.uid()
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "update_own_organisation" ON organisations;
CREATE POLICY "update_own_organisation" ON organisations
  FOR UPDATE TO authenticated
  USING (
    id = (
      SELECT p.organisation_id FROM profiles p
      WHERE p.auth_user_id = auth.uid()
      LIMIT 1
    )
  )
  WITH CHECK (
    id = (
      SELECT p.organisation_id FROM profiles p
      WHERE p.auth_user_id = auth.uid()
      LIMIT 1
    )
  );