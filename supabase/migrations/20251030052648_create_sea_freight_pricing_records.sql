/*
  # Create Sea Freight Pricing Records System

  ## Overview
  This migration creates a comprehensive system for tracking sea freight shipping costs
  with detailed component breakdowns and historical analytics capabilities.

  ## 1. New Tables
    - `sea_freight_pricing_records`
      - `id` (uuid, primary key) - Unique identifier for each pricing record
      - `quote_id` (uuid, foreign key) - Links to the associated quote
      - `parts_cost` (numeric) - Cost of parts/goods being shipped
      - `agent_service_fee` (numeric) - Agent commission and service charges
      - `supplier_packing_fee` (numeric) - Packing materials and labor costs
      - `banking_fee` (numeric) - Wire transfer or payment processing fees
      - `total_sea_freight_cost` (numeric) - Calculated sum of all components
      - `currency` (text) - Currency code (default: AUD)
      - `recorded_date` (timestamptz) - When this pricing was recorded
      - `created_by` (uuid) - User who created this record
      - `notes` (text) - Optional notes about this pricing record
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  ## 2. Indexes
    - Index on quote_id for efficient quote-based queries
    - Index on recorded_date for time-based analytics
    - Composite index on (quote_id, recorded_date) for optimal performance

  ## 3. Security
    - Enable RLS on sea_freight_pricing_records table
    - Users can view pricing records for quotes they have access to
    - Only authorized roles (admin, manager, buyer) can create/modify records
    - Proper access control aligned with quote permissions

  ## 4. Constraints
    - All cost fields must be non-negative
    - Total cost is automatically calculated
    - Currency must be a valid 3-letter code
*/

-- Create sea_freight_pricing_records table
CREATE TABLE IF NOT EXISTS sea_freight_pricing_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  parts_cost numeric(12,2) NOT NULL DEFAULT 0 CHECK (parts_cost >= 0),
  agent_service_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (agent_service_fee >= 0),
  supplier_packing_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (supplier_packing_fee >= 0),
  banking_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (banking_fee >= 0),
  total_sea_freight_cost numeric(12,2) GENERATED ALWAYS AS (
    parts_cost + agent_service_fee + supplier_packing_fee + banking_fee
  ) STORED,
  currency text NOT NULL DEFAULT 'AUD' CHECK (length(currency) = 3),
  recorded_date timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sea_freight_pricing_quote 
  ON sea_freight_pricing_records(quote_id);

CREATE INDEX IF NOT EXISTS idx_sea_freight_pricing_date 
  ON sea_freight_pricing_records(recorded_date DESC);

CREATE INDEX IF NOT EXISTS idx_sea_freight_pricing_quote_date 
  ON sea_freight_pricing_records(quote_id, recorded_date DESC);

CREATE INDEX IF NOT EXISTS idx_sea_freight_pricing_created_by 
  ON sea_freight_pricing_records(created_by);

-- Enable Row Level Security
ALTER TABLE sea_freight_pricing_records ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view pricing records if they can view the associated quote
CREATE POLICY "Users can view sea freight pricing for accessible quotes"
  ON sea_freight_pricing_records
  FOR SELECT
  TO authenticated
  USING (
    quote_id IN (
      SELECT quotes.id
      FROM quotes
      WHERE (
        auth.uid() IN (
          SELECT user_profiles.id
          FROM user_profiles
          WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
        ) OR quotes.created_by = auth.uid()
      )
    )
  );

-- RLS Policy: Authorized users can create pricing records
CREATE POLICY "Authorized users can create sea freight pricing records"
  ON sea_freight_pricing_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT user_profiles.id
      FROM user_profiles
      WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role, 'buyer'::user_role])
    )
  );

-- RLS Policy: Authorized users can update their own records or admins/managers can update any
CREATE POLICY "Authorized users can update sea freight pricing records"
  ON sea_freight_pricing_records
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_profiles.id
      FROM user_profiles
      WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
    ) OR created_by = auth.uid()
  );

-- RLS Policy: Authorized users can delete their own records or admins/managers can delete any
CREATE POLICY "Authorized users can delete sea freight pricing records"
  ON sea_freight_pricing_records
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_profiles.id
      FROM user_profiles
      WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
    ) OR created_by = auth.uid()
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_sea_freight_pricing_records_updated_at
  BEFORE UPDATE ON sea_freight_pricing_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create a function to get pricing analytics for a quote
CREATE OR REPLACE FUNCTION get_sea_freight_pricing_analytics(p_quote_id uuid)
RETURNS TABLE (
  total_records bigint,
  average_total_cost numeric,
  average_parts_cost numeric,
  average_agent_fee numeric,
  average_supplier_packing_fee numeric,
  average_banking_fee numeric,
  latest_total_cost numeric,
  min_total_cost numeric,
  max_total_cost numeric,
  cost_trend_direction text
) AS $$
DECLARE
  v_first_cost numeric;
  v_last_cost numeric;
BEGIN
  RETURN QUERY
  WITH analytics AS (
    SELECT
      COUNT(*)::bigint as record_count,
      AVG(total_sea_freight_cost) as avg_total,
      AVG(parts_cost) as avg_parts,
      AVG(agent_service_fee) as avg_agent,
      AVG(supplier_packing_fee) as avg_packing,
      AVG(banking_fee) as avg_banking,
      (SELECT total_sea_freight_cost FROM sea_freight_pricing_records 
       WHERE quote_id = p_quote_id 
       ORDER BY recorded_date DESC LIMIT 1) as latest_cost,
      MIN(total_sea_freight_cost) as min_cost,
      MAX(total_sea_freight_cost) as max_cost,
      (SELECT total_sea_freight_cost FROM sea_freight_pricing_records 
       WHERE quote_id = p_quote_id 
       ORDER BY recorded_date ASC LIMIT 1) as first_cost
    FROM sea_freight_pricing_records
    WHERE quote_id = p_quote_id
  )
  SELECT
    a.record_count,
    ROUND(a.avg_total, 2),
    ROUND(a.avg_parts, 2),
    ROUND(a.avg_agent, 2),
    ROUND(a.avg_packing, 2),
    ROUND(a.avg_banking, 2),
    a.latest_cost,
    a.min_cost,
    a.max_cost,
    CASE
      WHEN a.record_count < 2 THEN 'stable'
      WHEN a.latest_cost > a.first_cost THEN 'increasing'
      WHEN a.latest_cost < a.first_cost THEN 'decreasing'
      ELSE 'stable'
    END::text as trend
  FROM analytics a;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
