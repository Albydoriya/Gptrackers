/*
  # Create Allowed Users Table and OAuth Validation System

  ## Overview
  This migration implements a security system to restrict Google OAuth sign-in to only pre-approved users.
  
  ## Changes Made
  
  1. **New Table: allowed_users**
     - Stores email addresses of users authorized to access the system
     - Includes metadata about who added the user and when
     - Admin-only access via RLS policies
  
  2. **Validation Trigger**
     - Automatically validates new OAuth users against the allowed_users table
     - Blocks unauthorized users immediately after Google authentication
     - Cleans up unauthorized user records automatically
  
  3. **Initial Setup**
     - Pre-populates with demo account email addresses
     - These accounts can sign in via either email/password OR Google OAuth
  
  ## Security
  - RLS enabled with admin-only access
  - Trigger runs with security definer privileges to access auth schema
  - Unauthorized users are automatically removed from auth.users
  
  ## Important Notes
  - Existing users in user_profiles are NOT affected
  - Only new OAuth sign-ups are validated
  - Email/password sign-ups continue to work as before (creating viewer accounts)
*/

-- Create the allowed_users table
CREATE TABLE IF NOT EXISTS allowed_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  added_at timestamptz DEFAULT now(),
  added_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

-- Only admins can manage allowed users
CREATE POLICY "Only admins can view allowed users"
  ON allowed_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can insert allowed users"
  ON allowed_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update allowed users"
  ON allowed_users
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

CREATE POLICY "Only admins can delete allowed users"
  ON allowed_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_allowed_users_email ON allowed_users(email);

-- Create trigger function to validate OAuth users
CREATE OR REPLACE FUNCTION validate_oauth_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  user_email text;
  is_oauth_user boolean;
BEGIN
  -- Get the user's email
  user_email := NEW.email;
  
  -- Check if this is an OAuth user (they have app_metadata.provider)
  -- OAuth users have 'google' or other providers in their app_metadata
  is_oauth_user := (NEW.app_metadata->>'provider' IS NOT NULL AND NEW.app_metadata->>'provider' != 'email');
  
  -- Only validate OAuth users (not email/password sign-ups)
  IF is_oauth_user THEN
    -- Check if the email is in the allowed_users table
    IF NOT EXISTS (
      SELECT 1 FROM public.allowed_users
      WHERE email = user_email
    ) THEN
      -- User is not allowed - delete them immediately
      DELETE FROM auth.users WHERE id = NEW.id;
      
      -- Raise an exception to inform the system
      RAISE EXCEPTION 'Access denied: Your email address (%) is not authorized to access this system. Please contact your administrator.', user_email
        USING HINT = 'Only pre-approved users can sign in with Google.';
    END IF;
  END IF;
  
  -- User is allowed, continue with sign-in
  RETURN NEW;
END;
$$;

-- Create trigger that fires after user is created via OAuth
-- Note: We use AFTER INSERT because we need the user to exist first to check their metadata
DROP TRIGGER IF EXISTS validate_oauth_user_trigger ON auth.users;
CREATE TRIGGER validate_oauth_user_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION validate_oauth_user();

-- Insert demo accounts as allowed users
INSERT INTO allowed_users (email, notes) VALUES
  ('admin@company.com', 'Demo admin account'),
  ('manager@company.com', 'Demo manager account'),
  ('buyer@company.com', 'Demo buyer account'),
  ('viewer@company.com', 'Demo viewer account')
ON CONFLICT (email) DO NOTHING;

-- Add a helpful comment
COMMENT ON TABLE allowed_users IS 'List of email addresses authorized to access the system via OAuth. Only admins can manage this table.';
COMMENT ON FUNCTION validate_oauth_user() IS 'Validates that OAuth users are in the allowed_users list before allowing access. Automatically removes unauthorized users.';
