/*
  # Create Global Air Freight Price List System

  ## Overview
  This migration creates a comprehensive global price list management system for air freight
  pricing (per kg), independent of specific quotes. It allows tracking supplier costs per kg, 
  applying markups, and managing customer-facing prices for parts and air shipping.

  ## 1. New Tables
    - `air_freight_price_list`
      - `id` (uuid, primary key) - Unique identifier for each price list item
      - `part_id` (uuid, foreign key) - Links to parts table (nullable for generic shipping items)
      - `item_name` (text) - Name of the item/part
      - `item_description` (text) - Description of the item
      - `category` (text) - Category for grouping items
      - `supplier_cost_per_kg` (numeric) - Cost from supplier per kg
      - `supplier_packing_fee_per_kg` (numeric) - Packing fee per kg charged by supplier
      - `supplier_banking_fee` (numeric) - Banking/wire transfer fees (flat fee)
      - `supplier_other_fees` (numeric) - Other miscellaneous supplier fees (flat fee)
      - `total_supplier_cost_per_kg` (numeric, generated) - Total cost per kg from supplier
      - `markup_percentage` (numeric) - Markup percentage to apply
      - `customer_price_per_kg` (numeric, generated) - Price per kg to charge customer
      - `currency` (text) - Currency code (default: AUD)
      - `is_active` (boolean) - Whether this price is currently active
      - `effective_date` (timestamptz) - When this price becomes effective
      - `expiration_date` (timestamptz) - When this price expires (nullable)
      - `notes` (text) - Additional notes about pricing
      - `created_by` (uuid) - User who created this record
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

    - `air_freight_price_history`
      - Tracks all changes to price list items for audit trail
      - Contains snapshot of old values when prices are updated

  ## 2. Indexes
    - Index on part_id for quick part-based lookups
    - Index on is_active and effective_date for finding current prices
    - Index on category for filtering by category
    - Full-text search index on item_name and item_description

  ## 3. Security
    - Enable RLS on both tables
    - All authenticated users can view active price list items
    - Only admin, manager, and buyer roles can create/update prices
    - Complete audit trail maintained in history table

  ## 4. Functions
    - Function to automatically archive old prices to history when updated
    - Function to search price list with filters
    - Function to get price history
*/

-- Create air_freight_price_list table
CREATE TABLE IF NOT EXISTS air_freight_price_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid REFERENCES parts(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  item_description text DEFAULT '',
  category text DEFAULT 'General',
  supplier_cost_per_kg numeric(12,2) NOT NULL DEFAULT 0 CHECK (supplier_cost_per_kg >= 0),
  supplier_packing_fee_per_kg numeric(12,2) NOT NULL DEFAULT 0 CHECK (supplier_packing_fee_per_kg >= 0),
  supplier_banking_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (supplier_banking_fee >= 0),
  supplier_other_fees numeric(12,2) NOT NULL DEFAULT 0 CHECK (supplier_other_fees >= 0),
  total_supplier_cost_per_kg numeric(12,2) GENERATED ALWAYS AS (
    supplier_cost_per_kg + supplier_packing_fee_per_kg
  ) STORED,
  markup_percentage numeric(5,2) NOT NULL DEFAULT 25.00 CHECK (markup_percentage >= 0),
  customer_price_per_kg numeric(12,2) GENERATED ALWAYS AS (
    (supplier_cost_per_kg + supplier_packing_fee_per_kg) * (1 + markup_percentage / 100)
  ) STORED,
  currency text NOT NULL DEFAULT 'AUD' CHECK (length(currency) = 3),
  is_active boolean DEFAULT true,
  effective_date timestamptz DEFAULT now(),
  expiration_date timestamptz,
  notes text,
  tags text[] DEFAULT '{}',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_air_freight_expiration CHECK (expiration_date IS NULL OR expiration_date > effective_date)
);

-- Create price history table for audit trail
CREATE TABLE IF NOT EXISTS air_freight_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id uuid NOT NULL REFERENCES air_freight_price_list(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  item_description text,
  category text,
  supplier_cost_per_kg numeric(12,2),
  supplier_packing_fee_per_kg numeric(12,2),
  supplier_banking_fee numeric(12,2),
  supplier_other_fees numeric(12,2),
  total_supplier_cost_per_kg numeric(12,2),
  markup_percentage numeric(5,2),
  customer_price_per_kg numeric(12,2),
  currency text,
  change_reason text,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_air_freight_price_list_part 
  ON air_freight_price_list(part_id);

CREATE INDEX IF NOT EXISTS idx_air_freight_price_list_active 
  ON air_freight_price_list(is_active, effective_date DESC) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_air_freight_price_list_category 
  ON air_freight_price_list(category);

CREATE INDEX IF NOT EXISTS idx_air_freight_price_history_item 
  ON air_freight_price_history(price_list_id, changed_at DESC);

-- Create full-text search index
CREATE INDEX IF NOT EXISTS idx_air_freight_price_list_search 
  ON air_freight_price_list USING gin(to_tsvector('english', item_name || ' ' || COALESCE(item_description, '')));

-- Enable Row Level Security
ALTER TABLE air_freight_price_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE air_freight_price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can view active price list items
CREATE POLICY "Authenticated users can view active air freight prices"
  ON air_freight_price_list
  FOR SELECT
  TO authenticated
  USING (is_active = true OR auth.uid() IN (
    SELECT user_profiles.id
    FROM user_profiles
    WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role, 'buyer'::user_role])
  ));

-- RLS Policy: Authorized users can create price list items
CREATE POLICY "Authorized users can create air freight prices"
  ON air_freight_price_list
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT user_profiles.id
      FROM user_profiles
      WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role, 'buyer'::user_role])
    )
  );

-- RLS Policy: Authorized users can update price list items
CREATE POLICY "Authorized users can update air freight prices"
  ON air_freight_price_list
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_profiles.id
      FROM user_profiles
      WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role, 'buyer'::user_role])
    )
  );

-- RLS Policy: Only admins and managers can delete price list items
CREATE POLICY "Admins and managers can delete air freight prices"
  ON air_freight_price_list
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_profiles.id
      FROM user_profiles
      WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
    )
  );

-- RLS Policy: Users can view price history for items they can see
CREATE POLICY "Users can view air freight price history"
  ON air_freight_price_history
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
CREATE POLICY "System can insert air freight price history"
  ON air_freight_price_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_air_freight_price_list_updated_at
  BEFORE UPDATE ON air_freight_price_list
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to archive price changes to history
CREATE OR REPLACE FUNCTION archive_air_freight_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.supplier_cost_per_kg != NEW.supplier_cost_per_kg OR
      OLD.supplier_packing_fee_per_kg != NEW.supplier_packing_fee_per_kg OR
      OLD.supplier_banking_fee != NEW.supplier_banking_fee OR
      OLD.supplier_other_fees != NEW.supplier_other_fees OR
      OLD.markup_percentage != NEW.markup_percentage) THEN
    
    INSERT INTO air_freight_price_history (
      price_list_id,
      item_name,
      item_description,
      category,
      supplier_cost_per_kg,
      supplier_packing_fee_per_kg,
      supplier_banking_fee,
      supplier_other_fees,
      total_supplier_cost_per_kg,
      markup_percentage,
      customer_price_per_kg,
      currency,
      change_reason,
      changed_by
    ) VALUES (
      OLD.id,
      OLD.item_name,
      OLD.item_description,
      OLD.category,
      OLD.supplier_cost_per_kg,
      OLD.supplier_packing_fee_per_kg,
      OLD.supplier_banking_fee,
      OLD.supplier_other_fees,
      OLD.total_supplier_cost_per_kg,
      OLD.markup_percentage,
      OLD.customer_price_per_kg,
      OLD.currency,
      'Price updated',
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to archive changes
CREATE TRIGGER trigger_archive_air_freight_price_change
  BEFORE UPDATE ON air_freight_price_list
  FOR EACH ROW
  EXECUTE FUNCTION archive_air_freight_price_change();

-- Function to get active price list with filters
CREATE OR REPLACE FUNCTION get_active_air_freight_prices(
  p_category text DEFAULT NULL,
  p_search_term text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  part_id uuid,
  item_name text,
  item_description text,
  category text,
  supplier_cost_per_kg numeric,
  supplier_packing_fee_per_kg numeric,
  supplier_banking_fee numeric,
  supplier_other_fees numeric,
  total_supplier_cost_per_kg numeric,
  markup_percentage numeric,
  customer_price_per_kg numeric,
  currency text,
  effective_date timestamptz,
  expiration_date timestamptz,
  notes text,
  tags text[],
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pl.id,
    pl.part_id,
    pl.item_name,
    pl.item_description,
    pl.category,
    pl.supplier_cost_per_kg,
    pl.supplier_packing_fee_per_kg,
    pl.supplier_banking_fee,
    pl.supplier_other_fees,
    pl.total_supplier_cost_per_kg,
    pl.markup_percentage,
    pl.customer_price_per_kg,
    pl.currency,
    pl.effective_date,
    pl.expiration_date,
    pl.notes,
    pl.tags,
    pl.created_at,
    pl.updated_at
  FROM air_freight_price_list pl
  WHERE pl.is_active = true
    AND pl.effective_date <= now()
    AND (pl.expiration_date IS NULL OR pl.expiration_date > now())
    AND (p_category IS NULL OR pl.category = p_category)
    AND (p_search_term IS NULL OR 
         pl.item_name ILIKE '%' || p_search_term || '%' OR
         pl.item_description ILIKE '%' || p_search_term || '%')
  ORDER BY pl.item_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get price history for an item
CREATE OR REPLACE FUNCTION get_air_freight_price_history(p_price_list_id uuid)
RETURNS TABLE (
  id uuid,
  item_name text,
  supplier_cost_per_kg numeric,
  supplier_packing_fee_per_kg numeric,
  supplier_banking_fee numeric,
  supplier_other_fees numeric,
  total_supplier_cost_per_kg numeric,
  markup_percentage numeric,
  customer_price_per_kg numeric,
  currency text,
  change_reason text,
  changed_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.item_name,
    h.supplier_cost_per_kg,
    h.supplier_packing_fee_per_kg,
    h.supplier_banking_fee,
    h.supplier_other_fees,
    h.total_supplier_cost_per_kg,
    h.markup_percentage,
    h.customer_price_per_kg,
    h.currency,
    h.change_reason,
    h.changed_at
  FROM air_freight_price_history h
  WHERE h.price_list_id = p_price_list_id
  ORDER BY h.changed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;