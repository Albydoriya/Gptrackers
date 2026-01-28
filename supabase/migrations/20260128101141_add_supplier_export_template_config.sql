/*
  # Add Export Template Configuration to Suppliers

  1. Changes to suppliers table
    - Add `export_template_type` column (text) - stores which template to use (e.g., 'hpi', 'autrade', 'generic')
    - Add `template_config` column (jsonb) - stores supplier-specific template customizations
    
  2. Data Migration
    - Set HPI supplier to use 'hpi' template
    - Set all other suppliers to use 'generic' template as default
    
  3. Notes
    - Both columns are nullable to maintain backward compatibility
    - Generic template will be the fallback for any supplier without a specific template
    - Template config allows future customization without schema changes
*/

-- Add export template configuration columns to suppliers table
DO $$ 
BEGIN
  -- Add export_template_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'suppliers' 
    AND column_name = 'export_template_type'
  ) THEN
    ALTER TABLE suppliers 
    ADD COLUMN export_template_type text DEFAULT 'generic';
  END IF;

  -- Add template_config column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'suppliers' 
    AND column_name = 'template_config'
  ) THEN
    ALTER TABLE suppliers 
    ADD COLUMN template_config jsonb;
  END IF;
END $$;

-- Set HPI supplier to use 'hpi' template
UPDATE suppliers 
SET export_template_type = 'hpi' 
WHERE LOWER(name) = 'hpi';

-- Ensure all other suppliers have 'generic' as default
UPDATE suppliers 
SET export_template_type = 'generic' 
WHERE export_template_type IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN suppliers.export_template_type IS 'Template type to use for export (hpi, autrade, fuji, generic, etc.)';
COMMENT ON COLUMN suppliers.template_config IS 'JSON configuration for supplier-specific template customizations';