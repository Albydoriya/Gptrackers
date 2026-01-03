/*
  # Create Order Export History Table

  1. New Table
    - `order_export_history`
      - Tracks when orders are exported to Excel templates
      - Records export type, user, timestamp, and filename
      - Provides audit trail for supplier quote requests

  2. Security
    - Enable RLS
    - Users can view exports for orders they have access to
    - Only authorized users can create export records

  3. Features
    - Automatic timestamp tracking
    - Links to orders and users
    - Stores export metadata
*/

-- Create order_export_history table
CREATE TABLE IF NOT EXISTS order_export_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  export_type text NOT NULL,
  exported_by uuid NOT NULL REFERENCES auth.users(id),
  exported_at timestamptz DEFAULT now(),
  file_name text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT export_type_check CHECK (export_type IN ('hpi_supplier_template', 'generic', 'custom'))
);

-- Enable Row Level Security
ALTER TABLE order_export_history ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_export_history_order ON order_export_history(order_id, exported_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_history_user ON order_export_history(exported_by);
CREATE INDEX IF NOT EXISTS idx_export_history_type ON order_export_history(export_type);

-- RLS Policy: Users can view export history for orders they can access
CREATE POLICY "Users can view export history for accessible orders"
  ON order_export_history FOR SELECT
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

-- RLS Policy: Authorized users can create export records
CREATE POLICY "Authorized users can create export records"
  ON order_export_history FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM user_profiles WHERE role IN ('admin', 'manager', 'buyer')
    )
  );

-- RLS Policy: Admins and managers can view all export history
CREATE POLICY "Admins can view all export history"
  ON order_export_history FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM user_profiles WHERE role IN ('admin', 'manager')
    )
  );
