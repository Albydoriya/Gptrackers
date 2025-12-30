/*
  # Simplify Air Freight to Carrier-Based Rates

  ## Overview
  This migration simplifies the air freight pricing to a carrier-based system where each
  carrier (DHL, FedEx, etc.) has a simple cost rate and charge rate per kg.

  ## Changes
    1. Drop the complex air_freight_price_list table
    2. Create simplified air_freight_carriers table with:
       - carrier_name (e.g., "DHL", "FedEx")
       - cost_rate_per_kg (what we pay the carrier)
       - charge_rate_per_kg (what we charge customers)
       - Basic metadata fields

  ## Security
    - Enable RLS on the new table
    - Authenticated users can view active carriers
    - Only admin, manager, and buyer roles can create/update carriers
*/

-- Drop the old complex tables
DROP TABLE IF EXISTS air_freight_price_list CASCADE;
DROP TABLE IF EXISTS air_freight_price_history CASCADE;

-- Drop the old functions
DROP FUNCTION IF EXISTS archive_air_freight_price_change() CASCADE;
DROP FUNCTION IF EXISTS get_active_air_freight_prices(text, text) CASCADE;
DROP FUNCTION IF EXISTS get_air_freight_price_history(uuid) CASCADE;

-- Create simplified air_freight_carriers table
CREATE TABLE IF NOT EXISTS air_freight_carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_name text NOT NULL UNIQUE,
  cost_rate_per_kg numeric(12,2) NOT NULL DEFAULT 0 CHECK (cost_rate_per_kg >= 0),
  charge_rate_per_kg numeric(12,2) NOT NULL DEFAULT 0 CHECK (charge_rate_per_kg >= 0),
  profit_per_kg numeric(12,2) GENERATED ALWAYS AS (
    charge_rate_per_kg - cost_rate_per_kg
  ) STORED,
  profit_margin_percentage numeric(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN charge_rate_per_kg = 0 THEN 0
      ELSE ROUND(((charge_rate_per_kg - cost_rate_per_kg) / charge_rate_per_kg * 100), 2)
    END
  ) STORED,
  currency text NOT NULL DEFAULT 'AUD' CHECK (length(currency) = 3),
  is_active boolean DEFAULT true,
  effective_date timestamptz DEFAULT now(),
  expiration_date timestamptz,
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_air_freight_carrier_expiration CHECK (expiration_date IS NULL OR expiration_date > effective_date)
);

-- Create carrier rate history table for audit trail
CREATE TABLE IF NOT EXISTS air_freight_carrier_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid NOT NULL REFERENCES air_freight_carriers(id) ON DELETE CASCADE,
  carrier_name text NOT NULL,
  cost_rate_per_kg numeric(12,2),
  charge_rate_per_kg numeric(12,2),
  profit_per_kg numeric(12,2),
  currency text,
  change_reason text,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_air_freight_carriers_active 
  ON air_freight_carriers(is_active, effective_date DESC) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_air_freight_carriers_name 
  ON air_freight_carriers(carrier_name);

CREATE INDEX IF NOT EXISTS idx_air_freight_carrier_history_carrier 
  ON air_freight_carrier_history(carrier_id, changed_at DESC);

-- Enable Row Level Security
ALTER TABLE air_freight_carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE air_freight_carrier_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can view active carriers
CREATE POLICY "Authenticated users can view active carriers"
  ON air_freight_carriers
  FOR SELECT
  TO authenticated
  USING (is_active = true OR auth.uid() IN (
    SELECT user_profiles.id
    FROM user_profiles
    WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role, 'buyer'::user_role])
  ));

-- RLS Policy: Authorized users can create carriers
CREATE POLICY "Authorized users can create carriers"
  ON air_freight_carriers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT user_profiles.id
      FROM user_profiles
      WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role, 'buyer'::user_role])
    )
  );

-- RLS Policy: Authorized users can update carriers
CREATE POLICY "Authorized users can update carriers"
  ON air_freight_carriers
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_profiles.id
      FROM user_profiles
      WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role, 'buyer'::user_role])
    )
  );

-- RLS Policy: Only admins and managers can delete carriers
CREATE POLICY "Admins and managers can delete carriers"
  ON air_freight_carriers
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_profiles.id
      FROM user_profiles
      WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
    )
  );

-- RLS Policy: Users can view carrier history
CREATE POLICY "Users can view carrier history"
  ON air_freight_carrier_history
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_profiles.id
      FROM user_profiles
      WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role, 'buyer'::user_role])
    )
  );

-- RLS Policy: System can insert into history (for trigger)
CREATE POLICY "System can insert carrier history"
  ON air_freight_carrier_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_air_freight_carriers_updated_at
  BEFORE UPDATE ON air_freight_carriers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to archive carrier rate changes to history
CREATE OR REPLACE FUNCTION archive_air_freight_carrier_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.cost_rate_per_kg != NEW.cost_rate_per_kg OR
      OLD.charge_rate_per_kg != NEW.charge_rate_per_kg) THEN
    
    INSERT INTO air_freight_carrier_history (
      carrier_id,
      carrier_name,
      cost_rate_per_kg,
      charge_rate_per_kg,
      profit_per_kg,
      currency,
      change_reason,
      changed_by
    ) VALUES (
      OLD.id,
      OLD.carrier_name,
      OLD.cost_rate_per_kg,
      OLD.charge_rate_per_kg,
      OLD.profit_per_kg,
      OLD.currency,
      'Rate updated',
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to archive changes
CREATE TRIGGER trigger_archive_air_freight_carrier_change
  BEFORE UPDATE ON air_freight_carriers
  FOR EACH ROW
  EXECUTE FUNCTION archive_air_freight_carrier_change();

-- Function to get carrier rate history
CREATE OR REPLACE FUNCTION get_air_freight_carrier_history(p_carrier_id uuid)
RETURNS TABLE (
  id uuid,
  carrier_name text,
  cost_rate_per_kg numeric,
  charge_rate_per_kg numeric,
  profit_per_kg numeric,
  currency text,
  change_reason text,
  changed_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.carrier_name,
    h.cost_rate_per_kg,
    h.charge_rate_per_kg,
    h.profit_per_kg,
    h.currency,
    h.change_reason,
    h.changed_at
  FROM air_freight_carrier_history h
  WHERE h.carrier_id = p_carrier_id
  ORDER BY h.changed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;