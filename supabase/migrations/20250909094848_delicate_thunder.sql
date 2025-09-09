/*
  # Fix quotes and quote_parts relationship

  1. Add missing foreign key constraint
    - Add foreign key constraint from quote_parts.quote_id to quotes.id
    - This will allow Supabase to recognize the relationship for joins

  2. Update existing data if needed
    - Ensure data integrity before adding constraint
*/

-- Add the missing foreign key constraint
DO $$
BEGIN
  -- Check if the foreign key constraint doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'quote_parts_quote_id_fkey' 
    AND table_name = 'quote_parts'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE quote_parts 
    ADD CONSTRAINT quote_parts_quote_id_fkey 
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE;
  END IF;
END $$;