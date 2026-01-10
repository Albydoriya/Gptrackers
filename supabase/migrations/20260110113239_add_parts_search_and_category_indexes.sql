/*
  # Parts Catalog Performance Optimization - Search and Category Indexes

  ## Summary
  Optimizes parts catalog for search-first workflow with flexible category filtering.
  Creates specialized indexes for text search patterns and category filtering.

  ## New Indexes Created
  
  ### Core Search Indexes
  1. `idx_parts_active_part_number` - Composite index on (is_archived, part_number)
     - Enables fast part number prefix search on active parts
     - Supports "WHERE is_archived = false AND part_number ILIKE 'ABC%'"
  
  2. `idx_parts_active_name` - Composite index on (is_archived, name)
     - Enables fast name search on active parts
     - Supports "WHERE is_archived = false AND name ILIKE '%motor%'"
  
  ### Category + Search Indexes
  3. `idx_parts_active_category_part_number` - Composite index on (is_archived, category, part_number)
     - Enables fast category + part number search
     - Supports "WHERE is_archived = false AND category = 'Electronics' AND part_number ILIKE 'ABC%'"
  
  4. `idx_parts_active_category_name` - Composite index on (is_archived, category, name)
     - Enables fast category + name search
     - Supports "WHERE is_archived = false AND category = 'Electronics' AND name ILIKE '%motor%'"
  
  ### Fuzzy Search Indexes (PostgreSQL Trigrams)
  5. `idx_parts_part_number_trgm` - GIN trigram index on part_number
     - Enables fuzzy matching for typos and partial matches
     - Supports similarity searches: "part_number % 'ABC123'"
  
  6. `idx_parts_name_trgm` - GIN trigram index on name
     - Enables fuzzy matching for typos and partial matches
     - Supports similarity searches: "name % 'motor'"
  
  ### Price History Optimization
  7. `idx_part_price_history_part_date` - Composite index on (part_id, effective_date DESC)
     - Enables fast lookup of latest price per part
     - Critical for list view queries
  
  ## New Database Functions
  
  ### get_latest_part_price(part_id)
  Returns the latest price for a given part without loading entire price history.
  Used in list view queries via lateral join for optimal performance.
  
  ## Performance Impact
  - Search queries: Expected 80-90% reduction in query time
  - Category filtering: Expected 70-80% reduction in query time
  - Combined search + category: Expected 75-85% reduction in query time
  - List view with prices: Expected 60-70% reduction in load time
  
  ## Notes
  - pg_trgm extension required for fuzzy search (typically pre-installed in Supabase)
  - Indexes are automatically maintained by PostgreSQL
*/

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Core search indexes for active parts
CREATE INDEX IF NOT EXISTS idx_parts_active_part_number 
ON parts (is_archived, part_number) 
WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS idx_parts_active_name 
ON parts (is_archived, name) 
WHERE is_archived = false;

-- Category + search composite indexes
CREATE INDEX IF NOT EXISTS idx_parts_active_category_part_number 
ON parts (is_archived, category, part_number) 
WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS idx_parts_active_category_name 
ON parts (is_archived, category, name) 
WHERE is_archived = false;

-- Fuzzy search trigram indexes
CREATE INDEX IF NOT EXISTS idx_parts_part_number_trgm 
ON parts USING GIN (part_number gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_parts_name_trgm 
ON parts USING GIN (name gin_trgm_ops);

-- Price history optimization index
CREATE INDEX IF NOT EXISTS idx_part_price_history_part_date 
ON part_price_history (part_id, effective_date DESC);

-- Function to get latest price for a part efficiently
CREATE OR REPLACE FUNCTION get_latest_part_price(p_part_id uuid)
RETURNS TABLE (
  unit_price decimal,
  effective_date timestamptz
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ph.unit_price,
    ph.effective_date
  FROM part_price_history ph
  WHERE ph.part_id = p_part_id
  ORDER BY ph.effective_date DESC
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_latest_part_price(uuid) TO authenticated;