/*
  # Add Company Settings Table

  1. New Tables
    - `company_settings`
      - `id` (uuid, primary key)
      - `company_name` (text)
      - `logo_url` (text)
      - `website` (text)
      - `email` (text)
      - `phone` (text)
      - `address` (text)
      - `description` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `company_settings` table
    - Add policy for admins to manage company settings
    - Add policy for all authenticated users to read company settings

  3. Initial Data
    - Insert default company settings
*/

CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'Your Company Name',
  logo_url text DEFAULT 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1',
  website text,
  email text,
  phone text,
  address text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Policy for admins to manage company settings
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
  );

-- Policy for all authenticated users to read company settings
CREATE POLICY "Users can view company settings"
  ON company_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert default company settings
INSERT INTO company_settings (company_name, description) 
VALUES (
  'Your Company Name',
  'Leading provider of industrial parts and components'
) ON CONFLICT DO NOTHING;

-- Add trigger to update updated_at column
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();