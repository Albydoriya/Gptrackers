/*
  # Fix Security Issues

  1. Performance & Security Improvements
    - Add missing index for `allowed_users.added_by` foreign key
    - Optimize RLS policies to use `(select auth.uid())` pattern for better performance
    - Fix function search paths to be immutable
    - Consolidate multiple permissive policies into single policies

  2. Changes
    - **Indexes**: Add index on `allowed_users(added_by)`
    - **RLS Policies**: Update all auth function calls in policies to use subselect pattern
    - **Functions**: Set stable search_path for functions
    - **Policy Consolidation**: Merge multiple permissive policies where applicable

  3. Tables Affected
    - `allowed_users`
    - `order_export_history`
    - `user_profiles`
    - `orders`
    - `part_categories`

  4. Security Notes
    - All changes maintain existing security model
    - Performance improvements at scale for RLS policy evaluation
    - Functions now use stable search_path for security
*/

-- =============================================
-- 1. ADD MISSING INDEXES
-- =============================================

-- Add index for allowed_users.added_by foreign key
CREATE INDEX IF NOT EXISTS idx_allowed_users_added_by 
ON allowed_users(added_by);

-- =============================================
-- 2. FIX RLS POLICIES - ALLOWED_USERS TABLE
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Only admins can view allowed users" ON allowed_users;
DROP POLICY IF EXISTS "Only admins can insert allowed users" ON allowed_users;
DROP POLICY IF EXISTS "Only admins can update allowed users" ON allowed_users;
DROP POLICY IF EXISTS "Only admins can delete allowed users" ON allowed_users;

-- Recreate with optimized auth checks
CREATE POLICY "Only admins can view allowed users"
  ON allowed_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can insert allowed users"
  ON allowed_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update allowed users"
  ON allowed_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete allowed users"
  ON allowed_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
  );

-- =============================================
-- 3. FIX RLS POLICIES - ORDER_EXPORT_HISTORY TABLE
-- =============================================

DROP POLICY IF EXISTS "Users can view export history" ON order_export_history;
DROP POLICY IF EXISTS "Authorized users can create export records" ON order_export_history;

CREATE POLICY "Users can view export history"
  ON order_export_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Authorized users can create export records"
  ON order_export_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'manager', 'viewer')
    )
  );

-- =============================================
-- 4. FIX RLS POLICIES - USER_PROFILES TABLE
-- =============================================

DROP POLICY IF EXISTS "Users can read profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON user_profiles;

CREATE POLICY "Users can read profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- =============================================
-- 5. FIX RLS POLICIES - ORDERS TABLE
-- =============================================

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Admin and managers can update any order" ON orders;
DROP POLICY IF EXISTS "Creators can update their draft or pending orders" ON orders;

-- Recreate as a single combined policy
CREATE POLICY "Users can update orders based on role"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    -- Admin and managers can update any order
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'manager')
    )
    OR
    -- Creators can update their draft or supplier_quoting orders
    (
      created_by = (SELECT auth.uid())
      AND status IN ('draft', 'supplier_quoting', 'pending_approval')
    )
  )
  WITH CHECK (
    -- Admin and managers can update any order
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'manager')
    )
    OR
    -- Creators can update their draft or supplier_quoting orders
    (
      created_by = (SELECT auth.uid())
      AND status IN ('draft', 'supplier_quoting', 'pending_approval')
    )
  );

-- =============================================
-- 6. FIX RLS POLICIES - PART_CATEGORIES TABLE
-- =============================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Admins can view all categories" ON part_categories;
DROP POLICY IF EXISTS "Users can view active categories" ON part_categories;

-- Recreate as a single combined policy
CREATE POLICY "Users can view categories based on status"
  ON part_categories
  FOR SELECT
  TO authenticated
  USING (
    -- Admins can view all categories
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role = 'admin'
    )
    OR
    -- Users can view active categories
    is_active = true
  );

-- =============================================
-- 7. FIX FUNCTION SEARCH PATHS
-- =============================================

-- Fix update_order_status_rpc function
CREATE OR REPLACE FUNCTION update_order_status_rpc(
  order_id_param uuid,
  new_status_param text,
  notes_param text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result json;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE orders
  SET 
    status = new_status_param::order_status,
    updated_at = now()
  WHERE id = order_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or no permission to update';
  END IF;

  INSERT INTO status_updates (
    order_id,
    status,
    notes,
    updated_by
  ) VALUES (
    order_id_param,
    new_status_param::order_status,
    notes_param,
    current_user_id
  );

  SELECT json_build_object(
    'success', true,
    'order_id', order_id_param,
    'new_status', new_status_param
  ) INTO result;

  RETURN result;
END;
$$;

-- Fix update_part_categories_updated_at trigger function
CREATE OR REPLACE FUNCTION update_part_categories_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================
-- 8. VERIFY INDEXES AND CLEANUP
-- =============================================

-- Analyze tables to update statistics after index creation
ANALYZE allowed_users;
ANALYZE order_export_history;
ANALYZE user_profiles;
ANALYZE orders;
ANALYZE part_categories;
