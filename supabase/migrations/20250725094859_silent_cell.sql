/*
  # Parts Ordering & Status Tracking System Database Schema

  1. New Tables
    - `suppliers` - Supplier information and contact details
    - `parts` - Parts catalog with specifications and pricing
    - `part_price_history` - Historical pricing data for parts
    - `orders` - Purchase orders with status tracking
    - `order_parts` - Junction table for order items
    - `status_updates` - Order status change history
    - `notifications` - System notifications
    - `user_profiles` - Extended user profile information

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on roles
    - Secure access to sensitive data

  3. Features
    - Full audit trail for orders and pricing
    - Role-based access control
    - Real-time notifications
    - Comprehensive parts catalog management
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE order_status AS ENUM (
  'draft',
  'pending_customer_approval', 
  'approved',
  'ordered',
  'in_transit',
  'delivered',
  'cancelled'
);

CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high');

CREATE TYPE notification_type AS ENUM (
  'order_status',
  'low_stock',
  'price_change',
  'delivery',
  'approval',
  'system'
);

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'buyer', 'viewer');

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  contact_person text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  rating decimal(2,1) DEFAULT 5.0 CHECK (rating >= 1 AND rating <= 5),
  delivery_time integer DEFAULT 5 CHECK (delivery_time > 0),
  payment_terms text DEFAULT 'Net 30',
  is_active boolean DEFAULT true,
  website text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Parts table
CREATE TABLE IF NOT EXISTS parts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_number text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'Electronics',
  specifications jsonb DEFAULT '{}',
  current_stock integer DEFAULT 0 CHECK (current_stock >= 0),
  min_stock integer DEFAULT 0 CHECK (min_stock >= 0),
  preferred_suppliers uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Part price history table
CREATE TABLE IF NOT EXISTS part_price_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_id uuid REFERENCES parts(id) ON DELETE CASCADE,
  price decimal(10,2) NOT NULL CHECK (price > 0),
  supplier_name text NOT NULL,
  quantity integer DEFAULT 1 CHECK (quantity > 0),
  effective_date date DEFAULT CURRENT_DATE,
  reason text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- User profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  role user_role DEFAULT 'viewer',
  department text,
  phone text,
  preferences jsonb DEFAULT '{}',
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number text UNIQUE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) NOT NULL,
  status order_status DEFAULT 'draft',
  priority priority_level DEFAULT 'medium',
  total_amount decimal(12,2) DEFAULT 0 CHECK (total_amount >= 0),
  order_date date DEFAULT CURRENT_DATE,
  expected_delivery date,
  actual_delivery date,
  notes text,
  shipping_data jsonb DEFAULT '{}',
  attachments jsonb DEFAULT '[]',
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order parts junction table
CREATE TABLE IF NOT EXISTS order_parts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  part_id uuid REFERENCES parts(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL CHECK (unit_price > 0),
  total_price decimal(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at timestamptz DEFAULT now()
);

-- Status updates table for audit trail
CREATE TABLE IF NOT EXISTS status_updates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  old_status order_status,
  new_status order_status NOT NULL,
  notes text,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  priority priority_level DEFAULT 'medium',
  is_read boolean DEFAULT false,
  related_id uuid,
  action_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suppliers
CREATE POLICY "Users can view active suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (is_active = true OR auth.uid() IN (
    SELECT id FROM user_profiles WHERE role IN ('admin', 'manager')
  ));

CREATE POLICY "Managers can manage suppliers"
  ON suppliers FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM user_profiles WHERE role IN ('admin', 'manager')
  ));

-- RLS Policies for parts
CREATE POLICY "Users can view parts"
  ON parts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authorized users can manage parts"
  ON parts FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM user_profiles WHERE role IN ('admin', 'manager', 'buyer')
  ));

-- RLS Policies for part price history
CREATE POLICY "Users can view price history"
  ON part_price_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authorized users can add price history"
  ON part_price_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (
    SELECT id FROM user_profiles WHERE role IN ('admin', 'manager', 'buyer')
  ));

-- RLS Policies for user profiles
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
  ON user_profiles FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM user_profiles WHERE role = 'admin'
  ));

-- RLS Policies for orders
CREATE POLICY "Users can view orders based on role"
  ON orders FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM user_profiles WHERE role IN ('admin', 'manager')
    ) OR 
    created_by = auth.uid()
  );

CREATE POLICY "Authorized users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (
    SELECT id FROM user_profiles WHERE role IN ('admin', 'manager', 'buyer')
  ));

CREATE POLICY "Authorized users can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM user_profiles WHERE role IN ('admin', 'manager')
    ) OR 
    (created_by = auth.uid() AND status IN ('draft', 'pending_customer_approval'))
  );

-- RLS Policies for order parts
CREATE POLICY "Users can view order parts if they can view the order"
  ON order_parts FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE 
        auth.uid() IN (
          SELECT id FROM user_profiles WHERE role IN ('admin', 'manager')
        ) OR 
        created_by = auth.uid()
    )
  );

CREATE POLICY "Authorized users can manage order parts"
  ON order_parts FOR ALL
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE 
        auth.uid() IN (
          SELECT id FROM user_profiles WHERE role IN ('admin', 'manager', 'buyer')
        ) OR 
        created_by = auth.uid()
    )
  );

-- RLS Policies for status updates
CREATE POLICY "Users can view status updates for accessible orders"
  ON status_updates FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE 
        auth.uid() IN (
          SELECT id FROM user_profiles WHERE role IN ('admin', 'manager')
        ) OR 
        created_by = auth.uid()
    )
  );

CREATE POLICY "Authorized users can create status updates"
  ON status_updates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (
    SELECT id FROM user_profiles WHERE role IN ('admin', 'manager', 'buyer')
  ));

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category);
CREATE INDEX IF NOT EXISTS idx_parts_stock_level ON parts(current_stock, min_stock);
CREATE INDEX IF NOT EXISTS idx_part_price_history_part_date ON part_price_history(part_id, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_orders_supplier ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_order_parts_order ON order_parts(order_id);
CREATE INDEX IF NOT EXISTS idx_status_updates_order ON status_updates(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- Create functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON parts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update order total when parts change
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orders 
  SET total_amount = (
    SELECT COALESCE(SUM(total_price), 0)
    FROM order_parts 
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
  )
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create triggers for order total calculation
CREATE TRIGGER update_order_total_on_insert AFTER INSERT ON order_parts
  FOR EACH ROW EXECUTE FUNCTION update_order_total();

CREATE TRIGGER update_order_total_on_update AFTER UPDATE ON order_parts
  FOR EACH ROW EXECUTE FUNCTION update_order_total();

CREATE TRIGGER update_order_total_on_delete AFTER DELETE ON order_parts
  FOR EACH ROW EXECUTE FUNCTION update_order_total();

-- Function to create status update records
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO status_updates (order_id, old_status, new_status, updated_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for status logging
CREATE TRIGGER log_order_status_changes AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_status_change();

-- Function to create low stock notifications
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_stock <= NEW.min_stock AND (OLD.current_stock IS NULL OR OLD.current_stock > OLD.min_stock) THEN
    INSERT INTO notifications (user_id, type, title, message, priority, related_id)
    SELECT 
      up.id,
      'low_stock',
      'Low Stock Alert',
      'Part ' || NEW.name || ' (' || NEW.part_number || ') is running low. Current stock: ' || NEW.current_stock || ' (Min: ' || NEW.min_stock || ')',
      'high',
      NEW.id
    FROM user_profiles up
    WHERE up.role IN ('admin', 'manager', 'buyer');
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for low stock notifications
CREATE TRIGGER check_part_low_stock AFTER UPDATE ON parts
  FOR EACH ROW EXECUTE FUNCTION check_low_stock();