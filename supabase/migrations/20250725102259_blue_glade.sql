/*
  # Fix Company Settings RLS and Storage

  1. Storage Setup
    - Create company-assets storage bucket
    - Set up proper public access policies
  
  2. Company Settings Table
    - Drop and recreate with proper RLS policies
    - Insert default company settings
    - Enable proper access controls

  3. Security
    - Allow all authenticated users to read company settings
    - Allow admins to update company settings
    - Public access to company-assets bucket for logo display
*/

-- Create storage bucket for company assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policy for public read access
CREATE POLICY "Public read access for company assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-assets');

-- Create storage policy for authenticated upload
CREATE POLICY "Authenticated users can upload company assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-assets');

-- Create storage policy for authenticated update
CREATE POLICY "Authenticated users can update company assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-assets');

-- Create storage policy for authenticated delete
CREATE POLICY "Authenticated users can delete company assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company-assets');

-- Drop existing RLS policies on company_settings
DROP POLICY IF EXISTS "Users can view company settings" ON company_settings;
DROP POLICY IF EXISTS "Admins can update company settings" ON company_settings;
DROP POLICY IF EXISTS "Admins can delete company settings" ON company_settings;
DROP POLICY IF EXISTS "Allow initial company settings creation" ON company_settings;

-- Temporarily disable RLS to insert default data
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
  null
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

-- Re-enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Create new RLS policies
CREATE POLICY "Anyone can view company settings"
ON company_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage company settings"
ON company_settings FOR ALL
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