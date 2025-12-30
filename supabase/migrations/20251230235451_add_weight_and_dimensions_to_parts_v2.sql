/*
  # Add Weight and Dimensions to Parts (v2)

  ## Overview
  Add physical measurement fields to the parts table to support air freight
  chargeable weight calculations. This includes actual weight and dimensional
  measurements needed to calculate volumetric weight.

  ## Changes
  1. Add weight and dimension columns to parts table:
     - `actual_weight_kg`: The actual weight of the item in kilograms
     - `length_cm`: Length in centimeters
     - `width_cm`: Width in centimeters
     - `height_cm`: Height in centimeters
     - `volumetric_weight_kg`: Calculated volumetric weight (computed column)
     - `chargeable_weight_kg`: The greater of actual or volumetric weight (computed column)
     - `dim_factor`: Dimensional weight factor (default 5000 for air freight)

  ## Notes
  - Volumetric Weight Formula: (L × W × H) / 5000
  - Chargeable Weight: MAX(actual_weight_kg, volumetric_weight_kg)
  - All measurements are optional to allow gradual data entry
  - Existing parts will have NULL values until updated
  - Fixed: chargeable_weight_kg now calculates directly without referencing other generated columns
*/

-- Add weight and dimension columns to parts table
DO $$
BEGIN
  -- Add actual weight in kg
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parts' AND column_name = 'actual_weight_kg'
  ) THEN
    ALTER TABLE parts ADD COLUMN actual_weight_kg numeric(10,3) CHECK (actual_weight_kg >= 0);
  END IF;

  -- Add length in cm
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parts' AND column_name = 'length_cm'
  ) THEN
    ALTER TABLE parts ADD COLUMN length_cm numeric(10,2) CHECK (length_cm >= 0);
  END IF;

  -- Add width in cm
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parts' AND column_name = 'width_cm'
  ) THEN
    ALTER TABLE parts ADD COLUMN width_cm numeric(10,2) CHECK (width_cm >= 0);
  END IF;

  -- Add height in cm
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parts' AND column_name = 'height_cm'
  ) THEN
    ALTER TABLE parts ADD COLUMN height_cm numeric(10,2) CHECK (height_cm >= 0);
  END IF;

  -- Add dimensional weight factor (default 5000 for air freight)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parts' AND column_name = 'dim_factor'
  ) THEN
    ALTER TABLE parts ADD COLUMN dim_factor numeric(10,2) DEFAULT 5000 CHECK (dim_factor > 0);
  END IF;

  -- Add volumetric weight (calculated from dimensions)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parts' AND column_name = 'volumetric_weight_kg'
  ) THEN
    ALTER TABLE parts ADD COLUMN volumetric_weight_kg numeric(10,3) GENERATED ALWAYS AS (
      CASE
        WHEN length_cm IS NOT NULL AND width_cm IS NOT NULL AND height_cm IS NOT NULL AND dim_factor IS NOT NULL AND dim_factor > 0
        THEN ROUND((length_cm * width_cm * height_cm / dim_factor)::numeric, 3)
        ELSE NULL
      END
    ) STORED;
  END IF;

  -- Add chargeable weight (greater of actual or volumetric, calculated directly from dimensions)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'parts' AND column_name = 'chargeable_weight_kg'
  ) THEN
    ALTER TABLE parts ADD COLUMN chargeable_weight_kg numeric(10,3) GENERATED ALWAYS AS (
      CASE
        -- Both actual weight and dimensions available
        WHEN actual_weight_kg IS NOT NULL 
             AND length_cm IS NOT NULL 
             AND width_cm IS NOT NULL 
             AND height_cm IS NOT NULL 
             AND dim_factor IS NOT NULL 
             AND dim_factor > 0
        THEN GREATEST(
          actual_weight_kg, 
          ROUND((length_cm * width_cm * height_cm / dim_factor)::numeric, 3)
        )
        -- Only actual weight available
        WHEN actual_weight_kg IS NOT NULL
        THEN actual_weight_kg
        -- Only dimensions available
        WHEN length_cm IS NOT NULL 
             AND width_cm IS NOT NULL 
             AND height_cm IS NOT NULL 
             AND dim_factor IS NOT NULL 
             AND dim_factor > 0
        THEN ROUND((length_cm * width_cm * height_cm / dim_factor)::numeric, 3)
        ELSE NULL
      END
    ) STORED;
  END IF;
END $$;

-- Add comment to explain the columns
COMMENT ON COLUMN parts.actual_weight_kg IS 'Actual weight of the item in kilograms';
COMMENT ON COLUMN parts.length_cm IS 'Length of the item in centimeters';
COMMENT ON COLUMN parts.width_cm IS 'Width of the item in centimeters';
COMMENT ON COLUMN parts.height_cm IS 'Height of the item in centimeters';
COMMENT ON COLUMN parts.dim_factor IS 'Dimensional weight divisor (default 5000 for air freight)';
COMMENT ON COLUMN parts.volumetric_weight_kg IS 'Calculated volumetric weight: (L × W × H) / dim_factor';
COMMENT ON COLUMN parts.chargeable_weight_kg IS 'Chargeable weight: MAX(actual_weight_kg, volumetric_weight_kg)';

-- Create index for parts with weight information (useful for freight calculations)
CREATE INDEX IF NOT EXISTS idx_parts_with_weight 
  ON parts(chargeable_weight_kg) 
  WHERE chargeable_weight_kg IS NOT NULL;