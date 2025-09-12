/*
  # Create Quotes System Database Schema

  1. New Tables
    - `customers`
      - `id` (uuid, primary key)
      - `name` (text, company name)
      - `contact_person` (text, main contact)
      - `email` (text, unique, contact email)
      - `phone` (text, contact phone)
      - `address` (text, company address)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `quotes`
      - `id` (uuid, primary key)
      - `quote_number` (text, unique)
      - `customer_id` (uuid, foreign key to customers)
      - `status` (enum: draft, sent, accepted, rejected, converted_to_order, expired)
      - `total_bid_items_cost` (numeric, sum of all quote items)
      - `shipping_cost_sea` (numeric, sea freight option)
      - `shipping_cost_air` (numeric, air freight option)
      - `selected_shipping_method` (text, sea or air)
      - `agent_fees` (numeric, agent commission)
      - `local_shipping_fees` (numeric, local delivery costs)
      - `subtotal_amount` (numeric, sum before GST)
      - `gst_amount` (numeric, 10% GST)
      - `grand_total_amount` (numeric, final total)
      - `quote_date` (date)
      - `expiry_date` (date)
      - `notes` (text, optional)
      - `created_by` (uuid, foreign key to users)
      - `converted_to_order_id` (uuid, foreign key to orders, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `quote_parts`
      - `id` (uuid, primary key)
      - `quote_id` (uuid, foreign key to quotes)
      - `part_id` (uuid, foreign key to parts, nullable for custom items)
      - `custom_part_name` (text, for non-catalog items)
      - `custom_part_description` (text, for non-catalog items)
      - `quantity` (integer, quantity ordered)
      - `unit_price` (numeric, price per unit for this quote)
      - `total_price` (numeric, calculated quantity * unit_price)
      - `is_custom_part` (boolean, true for custom items)
      - `pricing_tier` (text, internal/wholesale/trade/retail)
      - `created_at` (timestamp)

  2. Enums
    - `quote_status` enum for quote statuses

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users based on roles
    - Ensure proper access control for quote management

  4. Triggers
    - Auto-update timestamps
    - Calculate quote totals automatically
    - Generate quote numbers
*/

-- Create quote_status enum
CREATE TYPE quote_status AS ENUM (
  'draft',
  'sent', 
  'accepted',
  'rejected',
  'converted_to_order',
  'expired'
);

-- Create customers table
-- CREATE TABLE IF NOT EXISTS customers (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   name text NOT NULL,
--   contact_person text NOT NULL,
--   email text NOT NULL UNIQUE,
--   phone text NOT NULL,
--   address text NOT NULL,
--   created_at timestamptz DEFAULT now(),
--   updated_at timestamptz DEFAULT now(),
  
--   CONSTRAINT customers_name_check CHECK (length(trim(name)) > 0),
--   CONSTRAINT customers_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
-- );

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES customers(id),
  status quote_status DEFAULT 'draft',
  total_bid_items_cost numeric(12,2) DEFAULT 0,
  shipping_cost_sea numeric(12,2) DEFAULT 0,
  shipping_cost_air numeric(12,2) DEFAULT 0,
  selected_shipping_method text DEFAULT 'sea' CHECK (selected_shipping_method IN ('sea', 'air')),
  agent_fees numeric(12,2) DEFAULT 0,
  local_shipping_fees numeric(12,2) DEFAULT 0,
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
  
  CONSTRAINT quotes_expiry_date_check CHECK (expiry_date > quote_date),
  CONSTRAINT quotes_amounts_check CHECK (
    total_bid_items_cost >= 0 AND
    shipping_cost_sea >= 0 AND
    shipping_cost_air >= 0 AND
    agent_fees >= 0 AND
    local_shipping_fees >= 0 AND
    subtotal_amount >= 0 AND
    gst_amount >= 0 AND
    grand_total_amount >= 0
  )
);

-- Create quote_parts table
CREATE TABLE IF NOT EXISTS quote_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  part_id uuid REFERENCES parts(id),
  custom_part_name text,
  custom_part_description text,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price > 0),
  total_price numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  is_custom_part boolean DEFAULT false,
  pricing_tier text CHECK (pricing_tier IN ('internal', 'wholesale', 'trade', 'retail')),
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT quote_parts_part_check CHECK (
    (is_custom_part = true AND part_id IS NULL AND custom_part_name IS NOT NULL) OR
    (is_custom_part = false AND part_id IS NOT NULL AND custom_part_name IS NULL)
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON quotes(created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_date ON quotes(quote_date DESC);
CREATE INDEX IF NOT EXISTS idx_quote_parts_quote ON quote_parts(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_parts_part ON quote_parts(part_id);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_parts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers table
CREATE POLICY "Authenticated users can view customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authorized users can manage customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (
    uid() IN (
      SELECT user_profiles.id
      FROM user_profiles
      WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role, 'buyer'::user_role])
    )
  );

-- RLS Policies for quotes table
CREATE POLICY "Users can view quotes based on role"
  ON quotes
  FOR SELECT
  TO authenticated
  USING (
    uid() IN (
      SELECT user_profiles.id
      FROM user_profiles
      WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
    ) OR created_by = uid()
  );

CREATE POLICY "Authorized users can create quotes"
  ON quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uid() IN (
      SELECT user_profiles.id
      FROM user_profiles
      WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role, 'buyer'::user_role])
    )
  );

CREATE POLICY "Authorized users can update quotes"
  ON quotes
  FOR UPDATE
  TO authenticated
  USING (
    uid() IN (
      SELECT user_profiles.id
      FROM user_profiles
      WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
    ) OR (created_by = uid() AND status = ANY (ARRAY['draft'::quote_status, 'sent'::quote_status]))
  );

CREATE POLICY "Authorized users can delete quotes"
  ON quotes
  FOR DELETE
  TO authenticated
  USING (
    uid() IN (
      SELECT user_profiles.id
      FROM user_profiles
      WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
    ) OR (created_by = uid() AND status = 'draft'::quote_status)
  );

-- RLS Policies for quote_parts table
CREATE POLICY "Users can view quote parts if they can view the quote"
  ON quote_parts
  FOR SELECT
  TO authenticated
  USING (
    quote_id IN (
      SELECT quotes.id
      FROM quotes
      WHERE (
        uid() IN (
          SELECT user_profiles.id
          FROM user_profiles
          WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role])
        ) OR quotes.created_by = uid()
      )
    )
  );

CREATE POLICY "Authorized users can manage quote parts"
  ON quote_parts
  FOR ALL
  TO authenticated
  USING (
    quote_id IN (
      SELECT quotes.id
      FROM quotes
      WHERE (
        uid() IN (
          SELECT user_profiles.id
          FROM user_profiles
          WHERE user_profiles.role = ANY (ARRAY['admin'::user_role, 'manager'::user_role, 'buyer'::user_role])
        ) OR (quotes.created_by = uid() AND quotes.status = ANY (ARRAY['draft'::quote_status, 'sent'::quote_status]))
      )
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate quote totals
CREATE OR REPLACE FUNCTION calculate_quote_totals()
RETURNS TRIGGER AS $$
DECLARE
  quote_record RECORD;
  bid_items_total numeric(12,2);
  shipping_cost numeric(12,2);
  subtotal numeric(12,2);
  gst numeric(12,2);
  grand_total numeric(12,2);
BEGIN
  -- Get the quote record
  SELECT * INTO quote_record FROM quotes WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  
  -- Calculate total bid items cost
  SELECT COALESCE(SUM(total_price), 0) INTO bid_items_total
  FROM quote_parts
  WHERE quote_id = quote_record.id;
  
  -- Determine shipping cost based on selected method
  shipping_cost := CASE 
    WHEN quote_record.selected_shipping_method = 'sea' THEN quote_record.shipping_cost_sea
    WHEN quote_record.selected_shipping_method = 'air' THEN quote_record.shipping_cost_air
    ELSE 0
  END;
  
  -- Calculate subtotal (bid items + shipping + fees)
  subtotal := bid_items_total + shipping_cost + quote_record.agent_fees + quote_record.local_shipping_fees;
  
  -- Calculate GST (10% of subtotal)
  gst := subtotal * 0.10;
  
  -- Calculate grand total
  grand_total := subtotal + gst;
  
  -- Update the quotes table
  UPDATE quotes SET
    total_bid_items_cost = bid_items_total,
    subtotal_amount = subtotal,
    gst_amount = gst,
    grand_total_amount = grand_total,
    updated_at = now()
  WHERE id = quote_record.id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Function to generate quote numbers
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  year_suffix text;
  next_number integer;
  new_quote_number text;
BEGIN
  -- Get current year suffix
  year_suffix := EXTRACT(YEAR FROM CURRENT_DATE)::text;
  
  -- Get next sequential number for this year
  SELECT COALESCE(MAX(
    CASE 
      WHEN quote_number ~ ('^QTE-' || year_suffix || '-[0-9]+$')
      THEN (regexp_match(quote_number, '^QTE-' || year_suffix || '-([0-9]+)$'))[1]::integer
      ELSE 0
    END
  ), 0) + 1 INTO next_number
  FROM quotes;
  
  -- Generate new quote number
  new_quote_number := 'QTE-' || year_suffix || '-' || LPAD(next_number::text, 3, '0');
  
  -- Set the quote number if not already set
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := new_quote_number;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for quote number generation
CREATE TRIGGER generate_quote_number_trigger
  BEFORE INSERT ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION generate_quote_number();

-- Create triggers for quote total calculations
CREATE TRIGGER calculate_quote_totals_on_insert
  AFTER INSERT ON quote_parts
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quote_totals();

CREATE TRIGGER calculate_quote_totals_on_update
  AFTER UPDATE ON quote_parts
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quote_totals();

CREATE TRIGGER calculate_quote_totals_on_delete
  AFTER DELETE ON quote_parts
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quote_totals();

-- Create trigger to recalculate totals when shipping method changes
CREATE TRIGGER recalculate_quote_totals_on_quote_update
  AFTER UPDATE OF selected_shipping_method, shipping_cost_sea, shipping_cost_air, agent_fees, local_shipping_fees ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quote_totals();

-- Insert some sample customers for testing
INSERT INTO customers (name, contact_person, email, phone, address) VALUES
  ('Tech Solutions Ltd', 'Sarah Johnson', 'sarah.johnson@techsolutions.com', '+61 2 9876 5432', '123 Technology Drive, Sydney NSW 2000'),
  ('Industrial Components Co', 'Michael Chen', 'michael.chen@indcomp.com.au', '+61 3 8765 4321', '456 Manufacturing Street, Melbourne VIC 3000'),
  ('Precision Engineering', 'Emma Wilson', 'emma.wilson@precision.com.au', '+61 7 7654 3210', '789 Engineering Way, Brisbane QLD 4000'),
  ('Global Electronics', 'David Brown', 'david.brown@globalelec.com', '+61 8 6543 2109', '321 Electronics Boulevard, Perth WA 6000'),
  ('Advanced Systems', 'Lisa Taylor', 'lisa.taylor@advsystems.com.au', '+61 2 5432 1098', '654 Innovation Crescent, Sydney NSW 2001')
ON CONFLICT (email) DO NOTHING;
