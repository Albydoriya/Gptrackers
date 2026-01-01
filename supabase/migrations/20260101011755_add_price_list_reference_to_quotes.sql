/*
  # Add Sea Freight Price List Reference to Quotes

  ## Overview
  This migration adds support for linking quotes to the global sea freight price list,
  allowing quotes to reference standardized pricing instead of manual entry only.

  ## 1. Schema Changes
    - Add `sea_freight_price_list_id` column to quotes table
    - Add foreign key relationship to sea_freight_price_list table
    - Add `price_list_applied_at` timestamp to track when price was selected
    - Add `manual_price_override` boolean to indicate if price was manually adjusted

  ## 2. Data Integrity
    - Foreign key allows NULL values (price list selection is optional)
    - Existing quotes remain unaffected (NULL price_list_id)
    - Price list item can be deleted without affecting quotes (ON DELETE SET NULL)

  ## 3. Audit Trail
    - Track when price list was applied to quote
    - Track if manual overrides were made after price list selection
*/

-- Add price list reference columns to quotes table
DO $$
BEGIN
  -- Add sea_freight_price_list_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'sea_freight_price_list_id'
  ) THEN
    ALTER TABLE quotes ADD COLUMN sea_freight_price_list_id uuid REFERENCES sea_freight_price_list(id) ON DELETE SET NULL;
  END IF;

  -- Add timestamp for when price list was applied
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'price_list_applied_at'
  ) THEN
    ALTER TABLE quotes ADD COLUMN price_list_applied_at timestamptz;
  END IF;

  -- Add flag to indicate manual price override
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'manual_price_override'
  ) THEN
    ALTER TABLE quotes ADD COLUMN manual_price_override boolean DEFAULT false;
  END IF;

  -- Add snapshot of price list data at time of quote creation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'price_list_snapshot'
  ) THEN
    ALTER TABLE quotes ADD COLUMN price_list_snapshot jsonb;
  END IF;
END $$;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_quotes_price_list
  ON quotes(sea_freight_price_list_id)
  WHERE sea_freight_price_list_id IS NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN quotes.sea_freight_price_list_id IS 'Reference to global sea freight price list item used for this quote';
COMMENT ON COLUMN quotes.price_list_applied_at IS 'Timestamp when price list item was selected for this quote';
COMMENT ON COLUMN quotes.manual_price_override IS 'Indicates if shipping costs were manually adjusted after price list selection';
COMMENT ON COLUMN quotes.price_list_snapshot IS 'Snapshot of price list item data at time of quote creation for audit trail';
