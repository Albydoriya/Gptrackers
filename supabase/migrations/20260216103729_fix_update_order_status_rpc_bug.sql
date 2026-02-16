/*
  # Fix update_order_status_rpc Function Bug

  1. Problem
    - The function was trying to insert into a column named 'status' in status_updates table
    - The actual columns are 'old_status' and 'new_status'
    - This causes the status update to fail when changing to 'approved' status

  2. Changes
    - Capture the old status before updating
    - Insert both old_status and new_status into status_updates table
    - Maintain all security and RLS checks

  3. Security
    - Maintains SECURITY DEFINER and search_path restrictions
    - Authenticates user before any operations
    - Preserves all existing security measures
*/

-- Drop and recreate the function with the fix
DROP FUNCTION IF EXISTS update_order_status_rpc(uuid, text, text);

CREATE OR REPLACE FUNCTION update_order_status_rpc(
  order_id_param uuid,
  new_status_param text,
  notes_param text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result json;
  current_user_id uuid;
  old_status_value order_status;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Capture the old status before updating
  SELECT status INTO old_status_value
  FROM orders
  WHERE id = order_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Update the order status
  UPDATE orders
  SET 
    status = new_status_param::order_status,
    updated_at = now()
  WHERE id = order_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or no permission to update';
  END IF;

  -- Insert status update record with both old and new status
  INSERT INTO status_updates (
    order_id,
    old_status,
    new_status,
    notes,
    updated_by
  ) VALUES (
    order_id_param,
    old_status_value,
    new_status_param::order_status,
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
