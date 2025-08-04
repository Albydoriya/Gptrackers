/*
  # Fix Company Settings RLS Policies

  1. Security Updates
    - Update RLS policies for company_settings table
    - Allow authenticated users to read company settings
    - Allow admins to create/update company settings
    - Add policy for initial setup when no settings exist

  2. Changes
    - Drop existing restrictive policies
    - Add new policies with proper permissions
    - Enable proper access for company settings operations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can view company settings" ON company_settings;

-- Allow all authenticated users to read company settings
CREATE POLICY "Users can view company settings"
  ON company_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to insert/update company settings
CREATE POLICY "Admins can manage company settings"
  ON company_settings
  FOR ALL
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

-- Allow initial setup when no company settings exist (for first-time setup)
CREATE POLICY "Allow initial company settings creation"
  ON company_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM company_settings)
  );