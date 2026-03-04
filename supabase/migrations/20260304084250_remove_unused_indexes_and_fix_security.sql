/*
  # Remove Unused Indexes and Fix Security Issues

  1. Security Issues Fixed
    - Drop 50+ unused indexes that are not being utilized by queries
    - Fix mutable search_path in update_order_status_rpc function
    - Reduce database bloat and improve maintenance performance

  2. Unused Indexes Removed
    - allowed_users: idx_allowed_users_added_by, idx_allowed_users_email
    - quotes: Multiple status-related composite indexes
    - orders: Multiple status-related and timestamp indexes
    - order_parts: idx_order_parts_part_id
    - parts: Multiple active/search indexes
    - agent_fees: Multiple foreign key indexes
    - air_freight tables: History and carrier indexes
    - sea_freight tables: History and price list indexes
    - status_updates: Foreign key indexes
    - export_history: User and type indexes
    - suppliers: Logo index
    - part_categories: Name index

  3. Function Security
    - Update update_order_status_rpc to use immutable search_path
    - Change from 'public, pg_temp' to 'pg_catalog, pg_temp'
    - Explicitly schema-qualify all table and function references

  4. Performance Impact
    - Positive: Reduced storage overhead, faster maintenance operations
    - No negative impact: These indexes were not being used by any queries
*/

-- Drop unused indexes on allowed_users
DROP INDEX IF EXISTS idx_allowed_users_added_by;
DROP INDEX IF EXISTS idx_allowed_users_email;

-- Drop unused indexes on quotes
DROP INDEX IF EXISTS idx_quotes_status_date;
DROP INDEX IF EXISTS idx_quotes_status_customer;
DROP INDEX IF EXISTS idx_quotes_status_number;
DROP INDEX IF EXISTS idx_quotes_status_amount;
DROP INDEX IF EXISTS idx_quotes_status_updated;
DROP INDEX IF EXISTS idx_quotes_converted_to_order_id;
DROP INDEX IF EXISTS idx_quotes_customer_id;
DROP INDEX IF EXISTS idx_quotes_sea_freight_price_list_id;
DROP INDEX IF EXISTS idx_quotes_converted_to_order_number;

-- Drop unused indexes on orders
DROP INDEX IF EXISTS idx_orders_status_order_date;
DROP INDEX IF EXISTS idx_orders_status_supplier;
DROP INDEX IF EXISTS idx_orders_status_order_number;
DROP INDEX IF EXISTS idx_orders_status_total_amount;
DROP INDEX IF EXISTS idx_orders_status_expected_delivery;
DROP INDEX IF EXISTS idx_orders_status_priority;
DROP INDEX IF EXISTS idx_orders_created_at;
DROP INDEX IF EXISTS idx_orders_updated_at;
DROP INDEX IF EXISTS idx_orders_status_created_at;
DROP INDEX IF EXISTS idx_orders_approved_by;
DROP INDEX IF EXISTS idx_orders_created_by;

-- Drop unused indexes on order_parts
DROP INDEX IF EXISTS idx_order_parts_part_id;

-- Drop unused indexes on parts
DROP INDEX IF EXISTS idx_parts_active_part_number;
DROP INDEX IF EXISTS idx_parts_active_name;
DROP INDEX IF EXISTS idx_parts_active_category_part_number;
DROP INDEX IF EXISTS idx_parts_active_category_name;
DROP INDEX IF EXISTS idx_parts_part_number_trgm;
DROP INDEX IF EXISTS idx_parts_name_trgm;
DROP INDEX IF EXISTS idx_parts_category;

-- Drop unused indexes on part_categories
DROP INDEX IF EXISTS idx_part_categories_name;

-- Drop unused indexes on agent_fees
DROP INDEX IF EXISTS idx_agent_fees_created_by;
DROP INDEX IF EXISTS idx_agent_fees_supplier_id;

-- Drop unused indexes on agent_fees_history
DROP INDEX IF EXISTS idx_agent_fees_history_changed_by;

-- Drop unused indexes on air_freight tables
DROP INDEX IF EXISTS idx_air_freight_carrier_history_carrier_id;
DROP INDEX IF EXISTS idx_air_freight_carrier_history_changed_by;
DROP INDEX IF EXISTS idx_air_freight_carriers_created_by;

-- Drop unused indexes on part_price_history
DROP INDEX IF EXISTS idx_part_price_history_created_by;

-- Drop unused indexes on quote_parts
DROP INDEX IF EXISTS idx_quote_parts_part_id;

-- Drop unused indexes on sea_freight tables
DROP INDEX IF EXISTS idx_sea_freight_price_history_changed_by;
DROP INDEX IF EXISTS idx_sea_freight_price_history_price_list_id;
DROP INDEX IF EXISTS idx_sea_freight_price_list_created_by;
DROP INDEX IF EXISTS idx_sea_freight_price_list_part_id;
DROP INDEX IF EXISTS idx_sea_freight_pricing_records_created_by;
DROP INDEX IF EXISTS idx_sea_freight_pricing_records_quote_id;

-- Drop unused indexes on status_updates
DROP INDEX IF EXISTS idx_status_updates_order_id;
DROP INDEX IF EXISTS idx_status_updates_updated_by;

-- Drop unused indexes on order_export_history
DROP INDEX IF EXISTS idx_export_history_order;
DROP INDEX IF EXISTS idx_export_history_user;
DROP INDEX IF EXISTS idx_export_history_type;

-- Drop unused indexes on suppliers
DROP INDEX IF EXISTS idx_suppliers_logo;

-- Fix search_path security issue in update_order_status_rpc
-- Drop both versions of the function
DROP FUNCTION IF EXISTS update_order_status_rpc(uuid, text);
DROP FUNCTION IF EXISTS update_order_status_rpc(uuid, text, text);

-- Recreate with secure search_path
CREATE OR REPLACE FUNCTION update_order_status_rpc(
  order_id_param uuid,
  new_status_param text,
  notes_param text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  result json;
  current_user_id uuid;
  old_status_value public.order_status;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Capture the old status before updating
  SELECT status INTO old_status_value
  FROM public.orders
  WHERE id = order_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Update the order status
  UPDATE public.orders
  SET 
    status = new_status_param::public.order_status,
    updated_at = now()
  WHERE id = order_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or no permission to update';
  END IF;

  -- Insert status update record with both old and new status
  INSERT INTO public.status_updates (
    order_id,
    old_status,
    new_status,
    notes,
    updated_by
  ) VALUES (
    order_id_param,
    old_status_value,
    new_status_param::public.order_status,
    notes_param,
    current_user_id
  );

  SELECT json_build_object(
    'success', true,
    'order_id', order_id_param,
    'old_status', old_status_value,
    'new_status', new_status_param
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_order_status_rpc(uuid, text, text) TO authenticated;

-- Add comment explaining the security hardening
COMMENT ON FUNCTION update_order_status_rpc IS 'Updates order status with security definer privileges. Uses immutable search_path (pg_catalog, pg_temp) to prevent search_path injection attacks.';
