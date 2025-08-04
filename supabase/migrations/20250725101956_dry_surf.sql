/*
  # Fix Company Settings RLS Policy

  1. Security Updates
    - Drop existing restrictive policies
    - Add proper policies for company settings access
    - Allow initial creation when no settings exist
    - Maintain admin-only updates for existing settings

  2. Policy Changes
    - SELECT: All authenticated users can view company settings
    - INSERT: Allow creation only when no settings exist (for initial setup)
    - UPDATE: Only admins can update existing settings
    - DELETE: Only admins can delete settings
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage company settings" ON company_settings;
DROP POLICY IF EXISTS "Allow initial company settings creation" ON company_settings;
DROP POLICY IF EXISTS "Users can view company settings" ON company_settings;

-- Create new policies with proper permissions
CREATE POLICY "Users can view company settings"
  ON company_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow initial company settings creation"
  ON company_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM company_settings)
  );

CREATE POLICY "Admins can update company settings"
  ON company_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete company settings"
  ON company_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );