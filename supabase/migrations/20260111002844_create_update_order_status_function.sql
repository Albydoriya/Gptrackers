/*
  # Create RPC function for updating order status

  1. Purpose
    - Adds a PostgreSQL function to update order status with proper enum type casting
    - Fixes the PostgREST type inference issue with enum columns
  
  2. Changes
    - Creates `update_order_status_rpc` function that accepts string parameters
    - Function explicitly casts status string to order_status enum type
    - Returns boolean indicating success
  
  3. Security
    - Function runs with caller's permissions (SECURITY INVOKER)
    - Respects existing RLS policies on orders table
*/

CREATE OR REPLACE FUNCTION update_order_status_rpc(
  p_order_id uuid,
  p_new_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE orders
  SET status = p_new_status::order_status,
      updated_at = now()
  WHERE id = p_order_id;
  
  RETURN FOUND;
END;
$$;