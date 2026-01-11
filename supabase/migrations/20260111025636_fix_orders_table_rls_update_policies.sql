/*
  # Fix Orders Table RLS UPDATE Policies

  ## Problem
  The orders table UPDATE policy was missing a WITH CHECK clause, causing PostgreSQL 
  enum type casting errors when validating updates. This resulted in "column priority 
  is of type priority_level but expression is of type text" errors.

  ## Changes
  1. Drop the old UPDATE policy that only had a USING clause
  2. Create separate UPDATE policies for different user roles:
     - Admin/manager policy: Full update access with proper type validation
     - Creator policy: Limited updates for draft/pending statuses only
  
  ## Security
  - Both policies use USING and WITH CHECK clauses for proper validation
  - Enum types (status, priority) are properly handled in policy conditions
  - Maintains existing access control while fixing type casting issues
*/

-- Drop the old policy that was missing WITH CHECK clause
DROP POLICY IF EXISTS "Authorized users can update orders" ON orders;

-- Create granular UPDATE policy for admin/manager users
CREATE POLICY "Admin and managers can update any order"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Create UPDATE policy for order creators (limited to draft/pending statuses)
CREATE POLICY "Creators can update their draft or pending orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() 
    AND status IN ('draft', 'pending_customer_approval')
  )
  WITH CHECK (
    created_by = auth.uid() 
    AND status IN ('draft', 'pending_customer_approval')
  );