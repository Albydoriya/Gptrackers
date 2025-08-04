/*
  # Add email column to user_profiles table

  1. Schema Changes
    - Add `email` column to `user_profiles` table
    - Column will store user email addresses for display in admin interfaces

  2. Security
    - Email column will be accessible via existing RLS policies
    - Admins can read all profiles including emails
    - Users can read their own email

  3. Data Migration
    - New column will be populated for future user registrations
    - Existing users may need manual backfill if required
*/

-- Add email column to user_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN email text;
  END IF;
END $$;

-- Add index for email column for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- Update the updated_at timestamp for any future changes
-- (The existing trigger will handle this automatically)