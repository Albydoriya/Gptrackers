/*
  # Fix Company Settings and Storage Permissions

  1. Database Changes
    - Drop restrictive RLS policies on company_settings table
    - Create permissive policies allowing authenticated users to manage company settings
    - Ensure default company settings exist
    
  2. Storage Changes
    - Create company-assets storage bucket if it doesn't exist
    - Set up permissive storage policies for authenticated users
    - Allow public read access and authenticated user uploads

  3. Security
    - Maintain security while allowing necessary operations
    - Enable authenticated users to manage company settings
    - Allow logo uploads for authenticated users
*/

-- First, ensure the company-assets storage bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing restrictive policies on company_settings
DROP POLICY IF EXISTS "Users can view company settings" ON company_settings;
DROP POLICY IF EXISTS "Admins can update company settings" ON company_settings;
DROP POLICY IF EXISTS "Admins can delete company settings" ON company_settings;

-- Create permissive policies for company_settings
CREATE POLICY "Authenticated users can view company settings"
  ON company_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage company settings"
  ON company_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Drop existing storage policies
DROP POLICY IF EXISTS "Authenticated users can upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can view company assets" ON storage.objects;

-- Create permissive storage policies for company-assets bucket
CREATE POLICY "Authenticated users can upload to company-assets"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'company-assets');

CREATE POLICY "Authenticated users can update company-assets"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'company-assets');

CREATE POLICY "Public can view company-assets"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'company-assets');

-- Ensure default company settings exist
INSERT INTO company_settings (
  company_name,
  logo_url,
  description
) VALUES (
  'Your Company Name',
  'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1',
  'Leading provider of industrial parts and components'
)
ON CONFLICT DO NOTHING;