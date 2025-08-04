/*
  # Ensure Company Settings Exist

  1. Database Changes
    - Drop all existing RLS policies on company_settings table
    - Temporarily disable RLS to insert default settings
    - Create new, proper RLS policies
    - Ensure default company settings exist

  2. Security
    - Enable RLS on company_settings table
    - Allow all authenticated users to read company settings
    - Allow only admins to update company settings
    - No INSERT policy needed (settings created via migration)
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view company settings" ON company_settings;
DROP POLICY IF EXISTS "Admins can manage company settings" ON company_settings;
DROP POLICY IF EXISTS "Allow initial company settings creation" ON company_settings;
DROP POLICY IF EXISTS "Users can view company settings" ON company_settings;
DROP POLICY IF EXISTS "Admins can update company settings" ON company_settings;

-- Temporarily disable RLS to insert default settings
ALTER TABLE company_settings DISABLE ROW LEVEL SECURITY;

-- Insert default company settings if none exist
INSERT INTO company_settings (
  company_name,
  logo_url,
  website,
  email,
  phone,
  address,
  description
)
SELECT 
  'Your Company Name',
  'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1',
  null,
  null,
  null,
  null,
  'Leading provider of industrial parts and components'
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

-- Re-enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Create proper RLS policies
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