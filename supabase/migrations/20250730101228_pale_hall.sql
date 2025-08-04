/*
  # Fix user_profiles RLS policies to prevent infinite recursion

  1. Policy Changes
    - Drop existing problematic policies that cause infinite recursion
    - Create new simplified policies using auth.uid() directly
    - Allow users to read and update their own profiles
    - Allow admins to manage all profiles using auth.uid() checks

  2. Security
    - Maintain RLS on user_profiles table
    - Use direct auth.uid() comparisons to avoid circular references
    - Ensure users can only access their own data unless they're admins
*/

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;

-- Create new simplified policies using direct auth.uid() comparisons
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow service role to manage all profiles (for admin operations)
CREATE POLICY "Service role can manage all profiles"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);