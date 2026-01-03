/*
  # Add Supplier Logo Field

  1. Changes
    - Add `logo_url` column to suppliers table
    - Stores path to supplier logo images
    - Used for branded Excel templates

  2. Notes
    - Nullable field (not all suppliers may have custom logos)
    - Should store relative path from public directory
    - Example: 'logos/hpi-logo.png'
*/

-- Add logo_url column to suppliers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN logo_url text;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_suppliers_logo ON suppliers(logo_url) WHERE logo_url IS NOT NULL;
