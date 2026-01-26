/*
  # Fix get_latest_part_price Function

  ## Issue
  - The function was querying `ph.unit_price` which doesn't exist
  - Actual column name in part_price_history table is `ph.price`
  - This caused all parts to show $0.00 prices in the catalog

  ## Changes
  - Update function to query the correct column `ph.price`
  - Alias the result as `unit_price` for compatibility with application layer
  - Convert effective_date from date to timestamptz for consistency

  ## Impact
  - All part prices will now display correctly in the Parts catalog
  - Price history will show properly in Part Details modal
  - Pricing tiers (Internal, Wholesale, Trade, Retail) will calculate correctly
*/

-- Drop and recreate the function with correct column names
DROP FUNCTION IF EXISTS get_latest_part_price(uuid);

CREATE OR REPLACE FUNCTION get_latest_part_price(p_part_id uuid)
RETURNS TABLE(unit_price numeric, effective_date timestamp with time zone)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ph.price as unit_price,
    ph.effective_date::timestamptz as effective_date
  FROM part_price_history ph
  WHERE ph.part_id = p_part_id
  ORDER BY ph.effective_date DESC
  LIMIT 1;
END;
$$;
