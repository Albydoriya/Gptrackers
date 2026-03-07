/*
  # Implement Secure Role-Based Access Control for Parts and Price History

  ## Overview
  This migration implements a comprehensive role-based security model for parts management,
  replacing the current "allow all authenticated users" approach with granular role-based
  permissions while maintaining data integrity through soft deletes.

  ## 1. New Tables and Fields
    
    ### Parts Table - New Fields:
    - `updated_by` (uuid) - Tracks which user last modified the part
    - Foreign key to auth.users(id)
    
  ## 2. Role-Based Access Control

    ### Parts Table Security:
    - **Admin/Manager/Buyer**: Can create (INSERT) and update (UPDATE) any parts
    - **Admin/Manager Only**: Can archive/unarchive parts via secure functions
    - **Viewer**: Read-only access (SELECT only)
    - **All Roles**: Cannot hard DELETE (blocked at database level)
    - **Soft Delete**: Uses is_archived flag, preserves all data

    ### Part Price History Security:
    - **Admin/Manager/Buyer**: Can add price records (INSERT) and view history (SELECT)
    - **Viewer**: Cannot see price history at all (blocked from SELECT)
    - **All Records**: Automatically track created_by via trigger

  ## 3. Database Functions (SECURITY DEFINER)
    
    ### archive_part(part_id UUID)
    - Validates user has admin or manager role
    - Sets is_archived = true instead of deleting
    - Returns success or error with clear messaging
    
    ### unarchive_part(part_id UUID)
    - Validates user has admin or manager role
    - Sets is_archived = false to restore part
    - Returns success or error with clear messaging
    
    ### add_part_with_initial_price(...)
    - Atomically creates part and initial price record
    - Validates user has admin, manager, or buyer role
    - Ensures both operations succeed or both fail
    - Returns the newly created part with its ID

  ## 4. Audit Trail
    
    ### Triggers:
    - Auto-populate created_by on parts INSERT
    - Auto-populate updated_by on parts UPDATE
    - Auto-populate created_by on part_price_history INSERT
    
  ## 5. Performance Indexes
    
    - Index on user_profiles(id, role) for fast role lookups
    - Index on parts(is_archived) for filtering
    - Index on part_price_history(part_id, created_by) for audit queries
    
  ## 6. Security Notes
    
    - All RLS policies explicitly check user roles via user_profiles table
    - Soft delete pattern ensures no data loss
    - SECURITY DEFINER functions include explicit role validation
    - Price history is hidden from viewer role completely
    - Audit fields track who created and last modified each record
    - All operations require authentication
    
  ## 7. Breaking Changes
    
    - Viewer role users will no longer see price history
    - Viewer role users cannot create or modify parts
    - Direct DELETE operations on parts table will fail for all users
    - Must use archive_part() function to archive parts
*/

-- ============================================================================
-- STEP 1: Add audit fields to parts table
-- ============================================================================

-- Add updated_by field to track who last modified each part
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parts' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE parts ADD COLUMN updated_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create triggers for automatic audit field population
-- ============================================================================

-- Trigger function to set created_by on INSERT
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$;

-- Trigger function to set updated_by on UPDATE
CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

-- Create trigger for parts.created_by (if not exists)
DROP TRIGGER IF EXISTS set_parts_created_by ON parts;
CREATE TRIGGER set_parts_created_by
  BEFORE INSERT ON parts
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

-- Create trigger for parts.updated_by
DROP TRIGGER IF EXISTS set_parts_updated_by ON parts;
CREATE TRIGGER set_parts_updated_by
  BEFORE UPDATE ON parts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_by();

-- Create trigger for part_price_history.created_by (if not exists)
DROP TRIGGER IF EXISTS set_part_price_history_created_by ON part_price_history;
CREATE TRIGGER set_part_price_history_created_by
  BEFORE INSERT ON part_price_history
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

-- ============================================================================
-- STEP 3: Drop existing permissive policies
-- ============================================================================

-- Drop parts table policies
DROP POLICY IF EXISTS "Authenticated users can insert parts" ON parts;
DROP POLICY IF EXISTS "Authenticated users can update parts" ON parts;
DROP POLICY IF EXISTS "Authenticated users can delete parts" ON parts;

-- Drop part_price_history policies
DROP POLICY IF EXISTS "Authenticated users can add price history" ON part_price_history;
DROP POLICY IF EXISTS "Authenticated users can view price history" ON part_price_history;

-- ============================================================================
-- STEP 4: Create secure role-based RLS policies for parts table
-- ============================================================================

-- SELECT policy: All authenticated users can view parts
CREATE POLICY "All authenticated users can view parts"
  ON parts FOR SELECT
  TO authenticated
  USING (true);

-- INSERT policy: Only admin, manager, and buyer can create parts
CREATE POLICY "Admin, manager, and buyer can insert parts"
  ON parts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

-- UPDATE policy: Only admin, manager, and buyer can update parts
CREATE POLICY "Admin, manager, and buyer can update parts"
  ON parts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'buyer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

-- DELETE policy: Block all hard deletes (enforce soft delete only)
CREATE POLICY "Block all hard deletes on parts"
  ON parts FOR DELETE
  TO authenticated
  USING (false);

-- ============================================================================
-- STEP 5: Create secure role-based RLS policies for part_price_history
-- ============================================================================

-- SELECT policy: Only admin, manager, and buyer can view price history
CREATE POLICY "Admin, manager, and buyer can view price history"
  ON part_price_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

-- INSERT policy: Only admin, manager, and buyer can add price records
CREATE POLICY "Admin, manager, and buyer can add price history"
  ON part_price_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

-- UPDATE policy: Block all updates to price history (immutable audit trail)
CREATE POLICY "Block all updates to price history"
  ON part_price_history FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- DELETE policy: Block all deletes to price history (immutable audit trail)
CREATE POLICY "Block all deletes on price history"
  ON part_price_history FOR DELETE
  TO authenticated
  USING (false);

-- ============================================================================
-- STEP 6: Create secure functions for soft delete operations
-- ============================================================================

-- Function to archive a part (soft delete)
CREATE OR REPLACE FUNCTION archive_part(part_id UUID)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role TEXT;
  result JSON;
BEGIN
  -- Get the user's role
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = auth.uid();

  -- Check if user has admin or manager role
  IF user_role NOT IN ('admin', 'manager') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Permission denied. Only admin and manager roles can archive parts.'
    );
  END IF;

  -- Check if part exists
  IF NOT EXISTS (SELECT 1 FROM parts WHERE id = part_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Part not found.'
    );
  END IF;

  -- Archive the part
  UPDATE parts
  SET is_archived = true, updated_by = auth.uid()
  WHERE id = part_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Part archived successfully.'
  );
END;
$$;

-- Function to unarchive a part (restore from soft delete)
CREATE OR REPLACE FUNCTION unarchive_part(part_id UUID)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role TEXT;
  result JSON;
BEGIN
  -- Get the user's role
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = auth.uid();

  -- Check if user has admin or manager role
  IF user_role NOT IN ('admin', 'manager') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Permission denied. Only admin and manager roles can unarchive parts.'
    );
  END IF;

  -- Check if part exists
  IF NOT EXISTS (SELECT 1 FROM parts WHERE id = part_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Part not found.'
    );
  END IF;

  -- Unarchive the part
  UPDATE parts
  SET is_archived = false, updated_by = auth.uid()
  WHERE id = part_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Part unarchived successfully.'
  );
END;
$$;

-- ============================================================================
-- STEP 7: Create atomic function for adding part with initial price
-- ============================================================================

CREATE OR REPLACE FUNCTION add_part_with_initial_price(
  p_part_number TEXT,
  p_description TEXT,
  p_category_id UUID,
  p_quantity_on_hand INTEGER DEFAULT 0,
  p_reorder_point INTEGER DEFAULT 0,
  p_unit_of_measure TEXT DEFAULT 'pcs',
  p_weight_kg NUMERIC DEFAULT NULL,
  p_length_cm NUMERIC DEFAULT NULL,
  p_width_cm NUMERIC DEFAULT NULL,
  p_height_cm NUMERIC DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL,
  p_supplier_part_number TEXT DEFAULT NULL,
  p_unit_cost NUMERIC DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role TEXT;
  new_part_id UUID;
  result JSON;
BEGIN
  -- Get the user's role
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = auth.uid();

  -- Check if user has admin, manager, or buyer role
  IF user_role NOT IN ('admin', 'manager', 'buyer') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Permission denied. Only admin, manager, and buyer roles can add parts.'
    );
  END IF;

  -- Validate required fields
  IF p_part_number IS NULL OR p_part_number = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Part number is required.'
    );
  END IF;

  IF p_category_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Category is required.'
    );
  END IF;

  -- Insert the new part
  INSERT INTO parts (
    part_number,
    description,
    category_id,
    quantity_on_hand,
    reorder_point,
    unit_of_measure,
    weight_kg,
    length_cm,
    width_cm,
    height_cm,
    is_archived,
    created_by
  ) VALUES (
    p_part_number,
    p_description,
    p_category_id,
    p_quantity_on_hand,
    p_reorder_point,
    p_unit_of_measure,
    p_weight_kg,
    p_length_cm,
    p_width_cm,
    p_height_cm,
    false,
    auth.uid()
  )
  RETURNING id INTO new_part_id;

  -- If initial price data is provided, insert it
  IF p_supplier_id IS NOT NULL AND p_unit_cost IS NOT NULL THEN
    INSERT INTO part_price_history (
      part_id,
      supplier_id,
      supplier_part_number,
      unit_cost,
      created_by
    ) VALUES (
      new_part_id,
      p_supplier_id,
      p_supplier_part_number,
      p_unit_cost,
      auth.uid()
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'part_id', new_part_id,
    'message', 'Part created successfully.'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- ============================================================================
-- STEP 8: Add performance indexes for RLS queries
-- ============================================================================

-- Index for fast role lookups in RLS policies
CREATE INDEX IF NOT EXISTS idx_user_profiles_id_role 
  ON user_profiles(id, role);

-- Index for filtering archived parts
CREATE INDEX IF NOT EXISTS idx_parts_is_archived 
  ON parts(is_archived) 
  WHERE is_archived = true;

-- Index for part price history audit queries
CREATE INDEX IF NOT EXISTS idx_part_price_history_part_created 
  ON part_price_history(part_id, created_by);

-- Index for parts updated_by audit queries
CREATE INDEX IF NOT EXISTS idx_parts_updated_by 
  ON parts(updated_by) 
  WHERE updated_by IS NOT NULL;

-- ============================================================================
-- STEP 9: Grant execute permissions on functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION archive_part(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unarchive_part(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_part_with_initial_price(
  TEXT, TEXT, UUID, INTEGER, INTEGER, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, UUID, TEXT, NUMERIC
) TO authenticated;
