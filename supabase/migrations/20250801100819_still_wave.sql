/*
  # Add admin user management policies

  1. Security Updates
    - Add policy for admins to view all user profiles
    - Add policy for admins to update user roles
    - Ensure proper access control for user management

  2. Changes
    - Allow admin users to SELECT all user profiles
    - Allow admin users to UPDATE role field for all users
    - Maintain existing user self-access policies
*/

-- Policy for admins to view all user profiles
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%admin%'
    )
    OR
    auth.uid() = id
  );

-- Policy for admins to update user roles
CREATE POLICY "Admins can update user roles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%admin%'
    )
    OR
    auth.uid() = id
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%admin%'
    )
    OR
    auth.uid() = id
  );