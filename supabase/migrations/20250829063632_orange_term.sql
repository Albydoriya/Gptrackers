/*
  # Add pricing tiers markup columns to parts table

  1. New Columns
    - `internal_usage_markup_percentage` (numeric, default 0.00)
    - `wholesale_markup_percentage` (numeric, default 0.00)
    - `trade_markup_percentage` (numeric, default 0.00)
    - `retail_markup_percentage` (numeric, default 0.00)

  2. Changes
    - Add four new markup percentage columns to parts table
    - These will be used to calculate pricing tiers from the base cost price
*/

ALTER TABLE public.parts
ADD COLUMN IF NOT EXISTS internal_usage_markup_percentage NUMERIC(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS wholesale_markup_percentage NUMERIC(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS trade_markup_percentage NUMERIC(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS retail_markup_percentage NUMERIC(5,2) DEFAULT 0.00;