/*
  # Set Japanese Template as Default for Suppliers

  1. Changes
    - Set default value for `export_template_type` column to 'japanese'
    - Update any NULL values to 'japanese' (preserves existing configured values like 'hpi')
  
  2. Impact
    - All new suppliers will automatically use Japanese template by default
    - Existing suppliers with explicit templates (like HPI with 'hpi') remain unchanged
    - Any suppliers without a configured template will now use Japanese format
  
  3. Notes
    - This ensures Japanese is the standard template for most suppliers
    - HPI and other special cases can be explicitly set to different templates
*/

-- Set default value for new suppliers
ALTER TABLE suppliers 
ALTER COLUMN export_template_type SET DEFAULT 'japanese';

-- Update any existing NULL values to 'japanese' (this preserves existing non-null values)
UPDATE suppliers 
SET export_template_type = 'japanese' 
WHERE export_template_type IS NULL;