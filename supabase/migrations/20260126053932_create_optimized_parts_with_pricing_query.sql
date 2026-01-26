/*
  # Optimized Parts Query with Pricing

  ## Purpose
  Create an optimized function that retrieves parts with their latest pricing in a single efficient query,
  eliminating N+1 query problems and improving catalog performance.

  ## Changes
  1. Create a function that joins parts with their latest price using a lateral join
  2. Returns all part fields plus the latest price and effective date
  3. Optimized for pagination and filtering

  ## Performance
  - Uses LATERAL JOIN for efficient subquery execution
  - Leverages existing indexes on part_price_history
  - Single query instead of N+1 queries

  ## Security
  - SECURITY DEFINER to access data with proper RLS context
  - SET search_path for security
*/

-- Create optimized function to get parts with their latest pricing
CREATE OR REPLACE FUNCTION get_parts_with_latest_pricing(
  p_search_term text DEFAULT '',
  p_category text DEFAULT 'all',
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_sort_by text DEFAULT 'name',
  p_sort_order text DEFAULT 'asc'
)
RETURNS TABLE(
  id uuid,
  part_number text,
  name text,
  description text,
  category text,
  specifications jsonb,
  current_stock integer,
  min_stock integer,
  preferred_suppliers text[],
  internal_usage_markup_percentage numeric,
  wholesale_markup_percentage numeric,
  trade_markup_percentage numeric,
  retail_markup_percentage numeric,
  actual_weight_kg numeric,
  length_cm numeric,
  width_cm numeric,
  height_cm numeric,
  dim_factor numeric,
  volumetric_weight_kg numeric,
  chargeable_weight_kg numeric,
  latest_price numeric,
  latest_price_date timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_sort_column text;
BEGIN
  -- Validate and set sort column
  v_sort_column := CASE p_sort_by
    WHEN 'part_number' THEN 'p.part_number'
    WHEN 'current_stock' THEN 'p.current_stock'
    WHEN 'price' THEN 'latest_price'
    ELSE 'p.name'
  END;

  RETURN QUERY EXECUTE format('
    WITH filtered_parts AS (
      SELECT 
        p.id,
        p.part_number,
        p.name,
        p.description,
        p.category,
        p.specifications,
        p.current_stock,
        p.min_stock,
        p.preferred_suppliers,
        p.internal_usage_markup_percentage,
        p.wholesale_markup_percentage,
        p.trade_markup_percentage,
        p.retail_markup_percentage,
        p.actual_weight_kg,
        p.length_cm,
        p.width_cm,
        p.height_cm,
        p.dim_factor,
        p.volumetric_weight_kg,
        p.chargeable_weight_kg,
        latest_price.price as latest_price,
        latest_price.effective_date as latest_price_date,
        COUNT(*) OVER() as total_count
      FROM parts p
      LEFT JOIN LATERAL (
        SELECT ph.price, ph.effective_date::timestamptz
        FROM part_price_history ph
        WHERE ph.part_id = p.id
        ORDER BY ph.effective_date DESC
        LIMIT 1
      ) latest_price ON true
      WHERE p.is_archived = false
        AND ($1 = '''' OR p.part_number ILIKE $2 OR p.name ILIKE $2)
        AND ($3 = ''all'' OR p.category = $3)
      ORDER BY %s %s
      LIMIT $4 OFFSET $5
    )
    SELECT * FROM filtered_parts
  ', v_sort_column, p_sort_order)
  USING p_search_term, '%' || p_search_term || '%', p_category, p_limit, p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_parts_with_latest_pricing TO authenticated;
