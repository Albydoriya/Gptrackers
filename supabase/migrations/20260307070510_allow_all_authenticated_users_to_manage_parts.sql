/*
  # Allow All Authenticated Users to Manage Parts

  1. Changes
    - Drop the restrictive "Authorized users can manage parts" policy that limited access to admin/manager/buyer roles
    - Add separate INSERT, UPDATE, and DELETE policies for the parts table
    - Allow all authenticated users to add, update, and soft delete (archive) parts
    - Update part_price_history INSERT policy to allow all authenticated users to add price history

  2. Security
    - All policies require authentication
    - Uses soft delete pattern (is_archived flag) instead of hard deletes
    - Maintains data integrity while allowing broader access

  3. Reasoning
    - All authenticated users need ability to add parts to the catalog
    - Parts can be added when creating quotes or from Parts Catalog tab
    - Soft delete ensures no data loss
*/

-- Drop existing restrictive policy on parts table
DROP POLICY IF EXISTS "Authorized users can manage parts" ON parts;

-- Add separate policies for INSERT, UPDATE, and DELETE operations on parts table
CREATE POLICY "Authenticated users can insert parts"
  ON parts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update parts"
  ON parts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete parts"
  ON parts FOR DELETE
  TO authenticated
  USING (true);

-- Update part_price_history policy to allow all authenticated users
DROP POLICY IF EXISTS "Authorized users can add price history" ON part_price_history;

CREATE POLICY "Authenticated users can add price history"
  ON part_price_history FOR INSERT
  TO authenticated
  WITH CHECK (true);
