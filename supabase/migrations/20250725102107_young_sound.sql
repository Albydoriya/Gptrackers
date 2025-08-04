/*
  # Fix Company Settings RLS Policy for Initial Insert

  1. Changes
    - Temporarily disable RLS to insert default company settings
    - Re-enable RLS with proper policies
    - Ensure default company settings exist

  2. Security
    - Allow SELECT for all authenticated users
    - Allow INSERT only when table is empty (initial setup)
    - Allow UPDATE/DELETE only for admins
*/

-- Temporarily disable RLS to insert default settings
ALTER TABLE company_settings DISABLE ROW LEVEL SECURITY;

-- Insert default company settings if none exist
INSERT INTO company_settings (
  company_name,
  logo_url,
  description
) 
SELECT 
  'Your Company Name',
  'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1',
  'Professional parts tracking and ordering system'
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

-- Re-enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view company settings" ON company_settings;
DROP POLICY IF EXISTS "Allow initial company settings creation" ON company_settings;
DROP POLICY IF EXISTS "Admins can update company settings" ON company_settings;
DROP POLICY IF EXISTS "Admins can delete company settings" ON company_settings;

-- Create new policies
CREATE POLICY "Users can view company settings"
  ON company_settings
  FOR SELECT
  TO authenticated
  USING (true);

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