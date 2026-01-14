/*
  # Create Part Categories Management System

  1. New Tables
    - `part_categories`
      - `id` (uuid, primary key)
      - `name` (text, unique, not null) - Category name
      - `description` (text, nullable) - Optional description
      - `display_order` (integer, not null) - For sorting categories
      - `is_active` (boolean, default true) - Soft delete flag
      - `created_at` (timestamptz) - Timestamp of creation
      - `updated_at` (timestamptz) - Timestamp of last update

  2. Seed Data
    - Insert 16 comprehensive automotive categories in logical display order

  3. Data Migration
    - Update all existing parts to use 'Uncategorized' category
    - Update default value for parts.category column

  4. Security
    - Enable RLS on `part_categories` table
    - Add policies for authenticated users to read categories
    - Add policies for admin users to manage categories

  5. Performance
    - Add indexes on name and display_order for fast lookups
    - Add index on parts.category for filtering performance
*/

-- Create part_categories table
CREATE TABLE IF NOT EXISTS part_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  display_order integer NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_part_categories_name ON part_categories(name);
CREATE INDEX IF NOT EXISTS idx_part_categories_display_order ON part_categories(display_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category);

-- Enable RLS
ALTER TABLE part_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for part_categories
CREATE POLICY "Users can view active categories"
  ON part_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can view all categories"
  ON part_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can insert categories"
  ON part_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can update categories"
  ON part_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can delete categories"
  ON part_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Seed 16 automotive categories
INSERT INTO part_categories (name, description, display_order) VALUES
  ('Engine Components', 'Engine blocks, pistons, crankshafts, camshafts, and related parts', 1),
  ('Transmission & Drivetrain', 'Transmissions, clutches, driveshafts, axles, and differential parts', 2),
  ('Suspension & Steering', 'Shocks, struts, control arms, tie rods, and steering components', 3),
  ('Brakes & Brake Parts', 'Brake pads, rotors, calipers, drums, and brake system components', 4),
  ('Electrical & Electronics', 'Alternators, starters, batteries, sensors, and electronic modules', 5),
  ('Body & Exterior', 'Panels, bumpers, fenders, doors, hoods, and exterior trim', 6),
  ('Interior & Trim', 'Seats, dashboard components, carpets, and interior trim pieces', 7),
  ('Cooling & Climate Control', 'Radiators, cooling fans, A/C compressors, and HVAC components', 8),
  ('Exhaust Systems', 'Mufflers, catalytic converters, exhaust pipes, and manifolds', 9),
  ('Fuel System', 'Fuel pumps, injectors, fuel tanks, and fuel system components', 10),
  ('Filters & Fluids', 'Oil filters, air filters, fuel filters, and automotive fluids', 11),
  ('Lighting', 'Headlights, tail lights, turn signals, and interior lighting', 12),
  ('Performance Parts', 'Turbochargers, intercoolers, performance exhausts, and tuning parts', 13),
  ('Tools & Equipment', 'Diagnostic tools, maintenance equipment, and automotive tools', 14),
  ('Accessories', 'Car care products, aftermarket accessories, and miscellaneous items', 15),
  ('Uncategorized', 'Parts not yet assigned to a specific category', 16)
ON CONFLICT (name) DO NOTHING;

-- Migrate all existing parts to 'Uncategorized'
UPDATE parts
SET category = 'Uncategorized'
WHERE category IS NULL OR category = '';

-- Update parts with old computer categories to Uncategorized
UPDATE parts
SET category = 'Uncategorized'
WHERE category IN (
  'Processors',
  'Graphics Cards',
  'Motherboards',
  'Memory',
  'Storage',
  'Power Supplies',
  'Cases',
  'Cooling',
  'Peripherals'
);

-- Update default value for category column
ALTER TABLE parts
  ALTER COLUMN category SET DEFAULT 'Uncategorized';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_part_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_part_categories_updated_at_trigger
  BEFORE UPDATE ON part_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_part_categories_updated_at();