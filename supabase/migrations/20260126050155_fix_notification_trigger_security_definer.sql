/*
  # Fix Row-Level Security Issues for Notification Triggers

  ## Problem
  Three trigger functions attempt to insert notifications but lack SECURITY DEFINER privileges,
  causing RLS policy violations (403 Forbidden errors):
  
  1. notify_price_change - Blocks part pricing updates
  2. notify_low_stock - Blocks stock level updates
  3. notify_order_status_change - Blocks order status changes

  ## Solution
  Add SECURITY DEFINER to all three notification trigger functions to allow them to bypass RLS
  when creating notifications. This is safe because:
  
  - Each function has built-in access control logic
  - notify_price_change only notifies admin, manager, and buyer roles
  - notify_low_stock only notifies admin, manager, and buyer roles
  - notify_order_status_change only notifies relevant users based on order ownership
  - Functions don't accept user input (they're triggered automatically)
  - The search_path is already set to prevent SQL injection

  ## Changes
  - Add SECURITY DEFINER to notify_price_change()
  - Add SECURITY DEFINER to notify_low_stock()
  - Add SECURITY DEFINER to notify_order_status_change()
*/

-- Fix 1: Price change notifications
-- Allows the trigger to insert notifications when part prices are updated
ALTER FUNCTION notify_price_change() SECURITY DEFINER;

-- Fix 2: Low stock notifications
-- Allows the trigger to insert notifications when stock levels drop below minimum
ALTER FUNCTION notify_low_stock() SECURITY DEFINER;

-- Fix 3: Order status change notifications
-- Allows the trigger to insert notifications when order status changes
ALTER FUNCTION notify_order_status_change() SECURITY DEFINER;
