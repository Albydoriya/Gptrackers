/*
  # Protect User Profile Role Column from Accidental Overwrites

  ## Summary
  This migration addresses a critical bug where the frontend's upsert logic could
  accidentally reset a user's role back to "viewer" if their profile fetch timed out
  during login. The fix operates at the database level to ensure role changes can
  only be made by admins, regardless of what the application layer sends.

  ## Changes

  ### 1. Updated RLS Policies on user_profiles
  - **DROP** the existing permissive UPDATE policy that allowed users to update
    any column (including the role column) in their own profile row
  - **CREATE** a new UPDATE policy that restricts self-updates to non-role columns
    only: full_name, avatar_url, department, email, preferences, last_login,
    updated_at, phone
  - **CREATE** a new admin-only UPDATE policy that allows admins to update any
    column including role

  ### 2. New Safe Profile Creation Function
  - `create_or_get_user_profile(...)` - SECURITY DEFINER function
  - If the profile row already exists, returns it with its EXISTING role intact
    (never overwrites the role)
  - If the profile row does not exist, creates it with the default "viewer" role
  - Atomic: safe against race conditions and network retries
  - Returns the profile row as JSON so the caller can use the real role

  ## Security
  - Users can no longer change their own role through any UPDATE call
  - Only admins (role = 'admin') can change any user's role
  - New users still get "viewer" by default; admins upgrade them as needed
  - The safe function prevents upsert race conditions from overwriting roles

  ## Important Notes
  1. The existing admin role-update path in UserManagement.tsx still works because
     the admin UPDATE policy permits it
  2. The frontend AuthContext must be updated to call create_or_get_user_profile()
     instead of upsert for new user profile creation
*/

-- ============================================================================
-- STEP 1: Replace the permissive self-update policy with a role-protected one
-- ============================================================================

-- Drop the old policy that allowed users to update any column including role
DROP POLICY IF EXISTS "Users can update profiles" ON user_profiles;

-- Allow users to update their own profile but NOT the role column
-- PostgreSQL column-level security via policy WITH CHECK is used here:
-- We prevent the role from being changed by checking new_role = old_role
CREATE POLICY "Users can update own profile non-role fields"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (
    id = (SELECT auth.uid())
    AND role = (SELECT role FROM user_profiles WHERE id = (SELECT auth.uid()))
  );

-- Allow admins to update any user profile including role changes
CREATE POLICY "Admins can update any user profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- ============================================================================
-- STEP 2: Create safe atomic profile creation function
-- ============================================================================

CREATE OR REPLACE FUNCTION create_or_get_user_profile(
  p_user_id     uuid,
  p_full_name   text,
  p_email       text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_profile user_profiles%ROWTYPE;
  new_profile      user_profiles%ROWTYPE;
BEGIN
  -- First, try to fetch an existing profile
  SELECT * INTO existing_profile
  FROM user_profiles
  WHERE id = p_user_id;

  IF FOUND THEN
    -- Profile exists: return it with its current role intact (no overwrite)
    RETURN row_to_json(existing_profile);
  END IF;

  -- Profile does not exist: create it with default viewer role
  INSERT INTO user_profiles (
    id,
    full_name,
    email,
    role,
    preferences,
    last_login,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_full_name,
    p_email,
    'viewer',
    '{}'::jsonb,
    now(),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
    -- If a concurrent insert raced us, DO NOT overwrite role.
    -- Just refresh timestamps so we get back the real row.
    SET last_login = now(),
        updated_at = now()
  RETURNING * INTO new_profile;

  RETURN row_to_json(new_profile);
END;
$$;

-- Grant execute to authenticated users (they call this during login)
GRANT EXECUTE ON FUNCTION create_or_get_user_profile(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION create_or_get_user_profile(uuid, text, text) IS
  'Safely creates a new user profile with viewer role, or returns the existing profile unchanged. Never overwrites the role column on conflict.';
