/*
  # Enable Realtime for Pricing Tables

  ## Summary
  This migration enables Supabase Realtime subscriptions for freight pricing tables
  to allow Create Quote interface to continuously monitor and update with the latest
  pricing changes.

  ## Changes Made
    1. Enable realtime for air_freight_carriers table
       - Sets replica identity to FULL for complete change tracking
       - Adds table to supabase_realtime publication
    
    2. Enable realtime for sea_freight_price_list table
       - Sets replica identity to FULL for complete change tracking
       - Adds table to supabase_realtime publication

  ## Impact
    - Quote creation interface will automatically detect and pull latest pricing updates
    - Users will always see current prices without manual refresh
    - Real-time updates on INSERT, UPDATE, and DELETE operations
*/

-- Enable replica identity for air_freight_carriers
ALTER TABLE air_freight_carriers REPLICA IDENTITY FULL;

-- Enable replica identity for sea_freight_price_list
ALTER TABLE sea_freight_price_list REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE air_freight_carriers;
ALTER PUBLICATION supabase_realtime ADD TABLE sea_freight_price_list;
