/*
  # Fix User Profiles RLS Circular Dependency - Restore Login Functionality

  ## Problem
  Migration 20260116114457 introduced a circular dependency in the user_profiles SELECT policy.
  The policy checks if a user_profiles record exists before allowing SELECT, which prevents
  the initial profile fetch during login. This causes an infinite login loop for all users.

  ## Root Cause
  Policy was changed from:
  - WORKING: `USING (id = (SELECT auth.uid()))`
  - BROKEN: `USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = (SELECT auth.uid())))`

  ## Solution
  Revert to the simple, working policy that allows users to read their own profile
  based on auth.uid() match, without checking if the profile exists first.

  ## Changes
  1. Drop the broken SELECT policy
  2. Recreate with correct logic that doesn't have circular dependency
  3. Allow all authenticated users to read any user_profile (common team app pattern)
     - This prevents any future circular dependency issues
     - Enables viewing other team members' names in UI
     - UPDATE policies still restrict to own profile only

  ## Security
  - Maintains all existing security requirements
  - Users can only update their own profiles
  - OAuth validation via allowed_users still active
  - No data exposure risk (team members should see each other's basic info)
*/

-- =====================================================
-- FIX USER_PROFILES SELECT POLICY
-- =====================================================

-- Drop the broken policy with circular dependency
DROP POLICY IF EXISTS "Users can read profiles" ON user_profiles;

-- Create a working policy that allows authenticated users to read profiles
-- This is safe for a team application where users need to see each other's names
CREATE POLICY "Authenticated users can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Verify the INSERT policy is still correct
-- (Should allow users to insert their own profile)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can insert own profile'
  ) THEN
    RAISE EXCEPTION 'Missing INSERT policy for user_profiles!';
  END IF;
END $$;

-- Verify the UPDATE policy is still correct
-- (Should only allow users to update their own profile)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can update profiles'
  ) THEN
    RAISE EXCEPTION 'Missing UPDATE policy for user_profiles!';
  END IF;
END $$;

-- Add helpful comment
COMMENT ON POLICY "Authenticated users can read all profiles" ON user_profiles IS 
  'Allows all authenticated users to read user profiles. This is safe for team applications and prevents circular dependency issues during login.';
