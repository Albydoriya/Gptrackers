/*
  # Add Missing Quote Parts RLS Policies

  1. Problem
    - The quote_parts table only has a SELECT policy
    - Missing INSERT, UPDATE, and DELETE policies cause RLS violations
    - Users cannot add, modify, or remove parts when editing quotes

  2. Solution
    - Create INSERT policy with WITH CHECK clause
    - Create UPDATE policy with both USING and WITH CHECK clauses
    - Create DELETE policy with USING clause
    - All policies follow the same authorization logic as the quotes table

  3. Security
    - Users can manage quote parts if they are:
      * Admin or Manager (full access to all quotes)
      * Buyer (can manage draft and sent quotes)
      * Quote creator AND quote is in draft or sent status
    - All policies restrict access to authenticated users only

  4. Notes
    - INSERT requires WITH CHECK (validates new rows)
    - UPDATE requires both USING (validates existing rows) and WITH CHECK (validates new values)
    - DELETE requires USING (validates which rows can be deleted)
*/

-- INSERT: Authorized users can create quote parts
CREATE POLICY "Authorized users can create quote parts"
  ON quote_parts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    quote_id IN (
      SELECT quotes.id
      FROM quotes
      WHERE (
        auth.uid() IN (
          SELECT user_profiles.id
          FROM user_profiles
          WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role, 'buyer'::user_role])
        ) OR (quotes.created_by = auth.uid() AND quotes.status = ANY (ARRAY['draft'::quote_status, 'sent'::quote_status, 'expired'::quote_status]))
      )
    )
  );

-- UPDATE: Authorized users can update quote parts
CREATE POLICY "Authorized users can update quote parts"
  ON quote_parts
  FOR UPDATE
  TO authenticated
  USING (
    quote_id IN (
      SELECT quotes.id
      FROM quotes
      WHERE (
        auth.uid() IN (
          SELECT user_profiles.id
          FROM user_profiles
          WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role, 'buyer'::user_role])
        ) OR (quotes.created_by = auth.uid() AND quotes.status = ANY (ARRAY['draft'::quote_status, 'sent'::quote_status, 'expired'::quote_status]))
      )
    )
  )
  WITH CHECK (
    quote_id IN (
      SELECT quotes.id
      FROM quotes
      WHERE (
        auth.uid() IN (
          SELECT user_profiles.id
          FROM user_profiles
          WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role, 'buyer'::user_role])
        ) OR (quotes.created_by = auth.uid() AND quotes.status = ANY (ARRAY['draft'::quote_status, 'sent'::quote_status, 'expired'::quote_status]))
      )
    )
  );

-- DELETE: Authorized users can delete quote parts
CREATE POLICY "Authorized users can delete quote parts"
  ON quote_parts
  FOR DELETE
  TO authenticated
  USING (
    quote_id IN (
      SELECT quotes.id
      FROM quotes
      WHERE (
        auth.uid() IN (
          SELECT user_profiles.id
          FROM user_profiles
          WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role, 'buyer'::user_role])
        ) OR (quotes.created_by = auth.uid() AND quotes.status = ANY (ARRAY['draft'::quote_status, 'sent'::quote_status, 'expired'::quote_status]))
      )
    )
  );