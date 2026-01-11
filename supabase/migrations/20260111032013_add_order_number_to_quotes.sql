/*
  # Add Order Number Tracking to Quotes

  1. Changes
    - Add `converted_to_order_number` column to quotes table
      - Stores the order number directly for quick reference
      - Nullable text field (only populated when quote is converted)
    
  2. Data Migration
    - Populate existing converted quotes with their order numbers
    - Uses a JOIN with the orders table to get order_number from converted_to_order_id
    
  3. Performance
    - Add index on converted_to_order_number for efficient lookups
    - Maintains referential integrity with existing converted_to_order_id field
    
  4. Security
    - No RLS changes needed (inherits existing quote table policies)
*/

-- Add the converted_to_order_number column to quotes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'converted_to_order_number'
  ) THEN
    ALTER TABLE quotes ADD COLUMN converted_to_order_number text;
  END IF;
END $$;

-- Populate existing converted quotes with their order numbers
UPDATE quotes q
SET converted_to_order_number = o.order_number
FROM orders o
WHERE q.converted_to_order_id = o.id
  AND q.converted_to_order_number IS NULL
  AND q.status = 'converted_to_order';

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_quotes_converted_to_order_number 
  ON quotes(converted_to_order_number) 
  WHERE converted_to_order_number IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN quotes.converted_to_order_number IS 
  'Stores the order number when a quote is converted to an order for quick reference and tracking';