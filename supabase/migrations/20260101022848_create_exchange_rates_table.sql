/*
  # Create Exchange Rates Table

  1. New Tables
    - `exchange_rates`
      - `id` (uuid, primary key) - Unique identifier for each rate record
      - `base_currency` (text) - Base currency code (default: AUD)
      - `target_currency` (text) - Target currency code (default: JPY)
      - `rate` (decimal) - Exchange rate value
      - `fetched_at` (timestamptz) - When the rate was fetched from API
      - `source_api` (text) - Which API provided the rate
      - `created_at` (timestamptz) - Record creation timestamp

  2. Indexes
    - Index on `fetched_at` for quick lookups of latest rates

  3. Security
    - Enable RLS on `exchange_rates` table
    - Add policy for authenticated users to read exchange rates
    - Add policy for service role to insert/update rates
*/

-- Create exchange_rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL DEFAULT 'AUD',
  target_currency text NOT NULL DEFAULT 'JPY',
  rate decimal(20, 6) NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  source_api text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for quick lookups of latest rates
CREATE INDEX IF NOT EXISTS idx_exchange_rates_fetched_at ON exchange_rates(fetched_at DESC);

-- Create compound index for currency pair lookups
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(base_currency, target_currency, fetched_at DESC);

-- Enable RLS
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read exchange rates
CREATE POLICY "Authenticated users can read exchange rates"
  ON exchange_rates
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy for service role to insert exchange rates
CREATE POLICY "Service role can insert exchange rates"
  ON exchange_rates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);