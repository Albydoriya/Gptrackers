/*
  # Add Missing created_by Column to Parts Table

  ## Overview
  This migration fixes a bug where the trigger `set_parts_created_by` attempted to set
  the `created_by` field on new part inserts, but this column didn't exist in the parts table.
  The previous migration (20260307072053) added the trigger and the `updated_by` column
  but forgot to add the `created_by` column.

  ## Changes
  
  1. **Add created_by Column**
     - Add `created_by` (uuid) column to parts table
     - References auth.users(id) for audit tracking
     - Nullable to allow existing records
  
  2. **Add Index**
     - Create index on created_by for performance
  
  ## Security
  - The existing trigger `set_parts_created_by` will automatically populate this field
  - Existing parts records will have created_by as NULL (acceptable for historical data)
  - RLS policies already handle authentication properly
*/

-- Add created_by column to parts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parts' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE parts ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add index for performance on queries filtering by created_by
CREATE INDEX IF NOT EXISTS idx_parts_created_by 
  ON parts(created_by) 
  WHERE created_by IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN parts.created_by IS 'User who created this part. Automatically populated by trigger set_parts_created_by.';
