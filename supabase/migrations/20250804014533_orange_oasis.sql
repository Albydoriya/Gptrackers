/*
  # Add is_archived column to parts table

  1. Schema Changes
    - Add `is_archived` column to `parts` table
      - Type: BOOLEAN
      - Default: FALSE
      - Not null constraint

  2. Purpose
    - Enable soft deletion of parts (archiving instead of deleting)
    - Preserve historical data while hiding archived parts from active catalog
    - Maintain referential integrity with existing orders
*/

-- Add is_archived column to parts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parts' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE parts ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- Add index for better query performance on archived status
CREATE INDEX IF NOT EXISTS idx_parts_is_archived ON parts(is_archived);