```sql


-- Create enums for quotes system
DO $$ BEGIN
  CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'converted_to_order', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE shipping_method AS ENUM ('sea', 'air');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers(id),
  status quote_status DEFAULT 'draft',
  total_bid_items_cost numeric(12,2) DEFAULT 0,
  shipping_cost_sea numeric(10,2) DEFAULT 0,
  shipping_cost_air numeric(10,2) DEFAULT 0,
  selected_shipping_method shipping_method DEFAULT 'sea',
  agent_fees numeric(10,2) DEFAULT 0,
  local_shipping_fees numeric(10,2) DEFAULT 0,
  subtotal_amount numeric(12,2) DEFAULT 0,
  gst_amount numeric(12,2) DEFAULT 0,
  grand_total_amount numeric(12,2) DEFAULT 0,
  quote_date date DEFAULT CURRENT_DATE,
  expiry_date date NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  converted_to_order_id uuid REFERENCES orders(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT quotes_total_bid_items_cost_check CHECK (total_bid_items_cost >= 0),
  CONSTRAINT quotes_shipping_cost_sea_check CHECK (shipping_cost_sea >= 0),
  CONSTRAINT quotes_shipping_cost_air_check CHECK (shipping_cost_air >= 0),
  CONSTRAINT quotes_agent_fees_check CHECK (agent_fees >= 0),
  CONSTRAINT quotes_local_shipping_fees_check CHECK (local_shipping_fees >= 0),
  CONSTRAINT quotes_subtotal_amount_check CHECK (subtotal_amount >= 0),
  CONSTRAINT quotes_gst_amount_check CHECK (gst_amount >= 0),
  CONSTRAINT quotes_grand_total_amount_check CHECK (grand_total_amount >= 0),
  CONSTRAINT quotes_expiry_date_check CHECK (expiry_date >= quote_date)
);

-- Create quote_parts table
CREATE TABLE IF NOT EXISTS quote_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  part_id uuid REFERENCES parts(id),
  custom_part_name text,
  custom_part_description text,
  quantity integer NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  total_price numeric(12,2) GENERATED ALWAYS AS (quantity::numeric * unit_price) STORED,
  is_custom_part boolean DEFAULT false,
  pricing_tier text,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT quote_parts_quantity_check CHECK (quantity > 0),
  CONSTRAINT quote_parts_unit_price_check CHECK (unit_price > 0),
  CONSTRAINT quote_parts_custom_part_check CHECK (
    (is_custom_part = true AND custom_part_name IS NOT NULL AND part_id IS NULL) OR
    (is_custom_part = false AND part_id IS NOT NULL AND custom_part_name IS NULL)
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON quotes(created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_date ON quotes(quote_date DESC);
CREATE INDEX IF NOT EXISTS idx_quote_parts_quote ON quote_parts(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_parts_part ON quote_parts(part_id);

-- Function to generate quote numbers
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS text AS $$
DECLARE
  current_year text;
  next_number integer;
  quote_number text;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::text;
  
  -- Get the next number for this year
  SELECT COALESCE(MAX(
    CASE 
      WHEN quote_number ~ ('^QTE-' || current_year || '-[0-9]+$')
      THEN CAST(SUBSTRING(quote_number FROM '^QTE-' || current_year || '-([0-9]+)$') AS integer)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM quotes;
  
  quote_number := 'QTE-' || current_year || '-' || LPAD(next_number::text, 3, '0');
  
  RETURN quote_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate quote totals
CREATE OR REPLACE FUNCTION calculate_quote_totals()
RETURNS trigger AS $$
DECLARE
  target_quote_id uuid;
  items_total numeric(12,2);
  shipping_cost numeric(10,2);
  subtotal numeric(12,2);
  gst numeric(12,2);
  grand_total numeric(12,2);
  quote_record_for_calc quotes%ROWTYPE;
BEGIN
  IF TG_TABLE_NAME = 'quote_parts' THEN
    -- Triggered by quote_parts table
    target_quote_id := COALESCE(NEW.quote_id, OLD.quote_id);
  ELSIF TG_TABLE_NAME = 'quotes' THEN
    -- Triggered by quotes table
    target_quote_id := NEW.id;
  ELSE
    -- Should not happen, but good for robustness
    RAISE EXCEPTION 'Unknown table triggering calculate_quote_totals: %', TG_TABLE_NAME;
  END IF;

  -- Get the current state of the quote record
  SELECT * INTO quote_record_for_calc FROM quotes WHERE id = target_quote_id;
  
  -- Calculate total bid items cost
  SELECT COALESCE(SUM(total_price), 0) INTO items_total
  FROM quote_parts 
  WHERE quote_id = target_quote_id;
  
  -- Get shipping cost based on selected method
  shipping_cost := CASE 
    WHEN quote_record_for_calc.selected_shipping_method = 'sea' THEN quote_record_for_calc.shipping_cost_sea
    ELSE quote_record_for_calc.shipping_cost_air
  END;
  
  -- Calculate subtotal (items + shipping + fees)
  subtotal := items_total + shipping_cost + quote_record_for_calc.agent_fees + quote_record_for_calc.local_shipping_fees;
  
  -- Calculate GST (10% of subtotal)
  gst := subtotal * 0.10;
  
  -- Calculate grand total
  grand_total := subtotal + gst;
  
  -- Update the quote with calculated totals
  UPDATE quotes SET
    total_bid_items_cost = items_total,
    subtotal_amount = subtotal,
    gst_amount = gst,
    grand_total_amount = grand_total,
    updated_at = now()
  WHERE id = target_quote_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate quote numbers
CREATE OR REPLACE TRIGGER set_quote_number_trigger
  BEFORE INSERT ON quotes
  FOR EACH ROW
  WHEN (NEW.quote_number IS NULL OR NEW.quote_number = '')
  EXECUTE FUNCTION generate_quote_number();


-- Triggers for automatic quote total calculation
CREATE OR REPLACE TRIGGER update_quote_totals_on_insert
  AFTER INSERT ON quote_parts
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quote_totals();

CREATE OR REPLACE TRIGGER update_quote_totals_on_update
  AFTER UPDATE ON quote_parts
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quote_totals();

CREATE OR REPLACE TRIGGER update_quote_totals_on_delete
  AFTER DELETE ON quote_parts
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quote_totals();

-- Trigger for recalculating totals when specific fields in 'quotes' are updated
CREATE OR REPLACE TRIGGER recalculate_quote_totals_on_quote_update
  AFTER UPDATE OF selected_shipping_method, shipping_cost_sea, shipping_cost_air, agent_fees, local_shipping_fees ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quote_totals();

-- Triggers for updating timestamps
CREATE OR REPLACE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_parts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "Authenticated users can view customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and buyers can manage customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'buyer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

-- RLS Policies for quotes
CREATE POLICY "Users can view quotes based on role"
  ON quotes
  FOR SELECT
  TO authenticated
  USING (
    -- Admins and managers can see all quotes
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
    OR
    -- Users can see their own quotes
    created_by = auth.uid()
  );

CREATE POLICY "Authorized users can create quotes"
  ON quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'buyer')
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Authorized users can update quotes"
  ON quotes
  FOR UPDATE
  TO authenticated
  USING (
    -- Admins and managers can update all quotes
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
    OR
    -- Users can update their own quotes if not converted
    (created_by = auth.uid() AND status != 'converted_to_order')
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
    OR
    (created_by = auth.uid() AND status != 'converted_to_order')
  );

CREATE POLICY "Authorized users can delete quotes"
  ON quotes
  FOR DELETE
  TO authenticated
  USING (
    -- Only admins and managers can delete quotes
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
    OR
    -- Users can delete their own draft quotes
    (created_by = auth.uid() AND status = 'draft')
  );

-- RLS Policies for quote_parts
CREATE POLICY "Users can view quote parts if they can view the quote"
  ON quote_parts
  FOR SELECT
  TO authenticated
  USING (
    quote_id IN (
      SELECT id FROM quotes
      WHERE 
        -- Admins and managers can see all
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'manager')
        )
        OR
        -- Users can see their own quotes
        created_by = auth.uid()
    )
  );

CREATE POLICY "Authorized users can manage quote parts"
  ON quote_parts
  FOR ALL
  TO authenticated
  USING (
    quote_id IN (
      SELECT id FROM quotes
      WHERE 
        -- Admins and managers can manage all
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'manager')
        )
        OR
        -- Users can manage their own quotes if not converted
        (created_by = auth.uid() AND status != 'converted_to_order')
    )
  )
  WITH CHECK (
    quote_id IN (
      SELECT id FROM quotes
      WHERE 
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'manager')
        )
        OR
        (created_by = auth.uid() AND status != 'converted_to_order')
    )
  );

-- Insert sample customers for testing
INSERT INTO customers (name, contact_person, email, phone, address) VALUES
  ('Precision Engineering Pty Ltd', 'Sarah Mitchell', 'sarah.mitchell@precision-eng.com.au', '+61 2 9876 5432', '45 Industrial Drive, Sydney NSW 2000, Australia'),
  ('Advanced Manufacturing Solutions', 'David Chen', 'david.chen@ams.com.au', '+61 3 8765 4321', '123 Factory Road, Melbourne VIC 3000, Australia'),
  ('TechCorp Australia', 'Emma Thompson', 'emma.thompson@techcorp.com.au', '+61 7 7654 3210', '78 Innovation Street, Brisbane QLD 4000, Australia'),
  ('Industrial Components Co.', 'Michael Roberts', 'michael.roberts@indcomp.com.au', '+61 8 6543 2109', '92 Component Avenue, Perth WA 6000, Australia'),
  ('Automation Systems Group', 'Lisa Wang', 'lisa.wang@autogroup.com.au', '+61 2 5432 1098', '156 Automation Boulevard, Sydney NSW 2001, Australia')
ON CONFLICT (id) DO NOTHING;
```