/*
  # Fix part_categories RLS Policies

  1. Problem
    - Existing policies try to access `auth.users` table directly
    - Users don't have permission to query `auth.users`
    - Causes "permission denied for table users" error

  2. Solution
    - Drop existing incorrect policies
    - Recreate policies using the `is_admin()` helper function
    - Align with security patterns used throughout the codebase

  3. New Policies
    - SELECT (active categories): All authenticated users can view active categories
    - SELECT (all categories): Only admins can view all categories including inactive ones
    - INSERT: Only admins can create categories
    - UPDATE: Only admins can update categories
    - DELETE: Only admins can delete categories

  4. Security
    - Uses existing `is_admin()` SECURITY DEFINER function
    - Properly checks user roles via `user_profiles` table
    - No direct access to `auth.users` table required
*/

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Users can view active categories" ON part_categories;
DROP POLICY IF EXISTS "Admins can view all categories" ON part_categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON part_categories;
DROP POLICY IF EXISTS "Admins can update categories" ON part_categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON part_categories;

-- Recreate policies with correct security pattern

-- All authenticated users can view active categories
CREATE POLICY "Users can view active categories"
  ON part_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can view all categories (including inactive)
CREATE POLICY "Admins can view all categories"
  ON part_categories FOR SELECT
  TO authenticated
  USING (is_admin());

-- Only admins can create categories
CREATE POLICY "Admins can insert categories"
  ON part_categories FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Only admins can update categories
CREATE POLICY "Admins can update categories"
  ON part_categories FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Only admins can delete categories
CREATE POLICY "Admins can delete categories"
  ON part_categories FOR DELETE
  TO authenticated
  USING (is_admin());