/*
  # Add Air Freight Carrier Tracking to Quotes

  1. Changes
    - Add `air_freight_carrier_id` column to `quotes` table
      - References the `air_freight_carriers` table
      - Nullable (allows manual entry without carrier selection)
      - Includes proper foreign key constraint
      
  2. Purpose
    - Track which air freight carrier was selected for each quote
    - Enable consistent carrier selection between CreateQuote and EditQuote
    - Support automatic air freight cost calculation based on carrier rates
    - Maintain backward compatibility with existing quotes using manual entry

  3. Notes
    - Existing quotes will have NULL carrier_id (manual entry mode)
    - When a carrier is selected, this field stores the reference
    - When manual entry is used, this field remains NULL
*/

-- Add air_freight_carrier_id column to quotes table
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS air_freight_carrier_id uuid REFERENCES air_freight_carriers(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_quotes_air_freight_carrier_id ON quotes(air_freight_carrier_id);

-- Add comment for documentation
COMMENT ON COLUMN quotes.air_freight_carrier_id IS 'Reference to the air freight carrier selected for this quote. NULL indicates manual cost entry.';