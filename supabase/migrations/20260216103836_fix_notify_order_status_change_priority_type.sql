/*
  # Fix notify_order_status_change Function Priority Type Cast

  1. Problem
    - The notify_order_status_change trigger function inserts plain text values ('high', 'medium', 'low') 
      into the notifications table's priority column
    - The priority column expects priority_level enum type, not text
    - This causes "column priority is of type priority_level but expression is of type text" error
    - Error occurs when changing order status to 'approved' or any status that triggers notifications

  2. Changes
    - Add explicit type cast to priority_level enum in the CASE statement
    - This ensures the text values are properly converted to the enum type before insertion

  3. Security
    - Maintains SECURITY DEFINER for proper notification creation
    - No changes to authentication or authorization logic
*/

-- Fix the notify_order_status_change function to cast priority to priority_level enum
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get user profile information for the order creator
    SELECT full_name INTO user_profile
    FROM user_profiles 
    WHERE id = NEW.created_by;
    
    -- Insert notification for the order creator
    IF NEW.created_by IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        priority,
        related_id
      ) VALUES (
        NEW.created_by,
        'order_status',
        'Order Status Updated',
        'Order ' || NEW.order_number || ' status changed from ' || 
        COALESCE(OLD.status::text, 'unknown') || ' to ' || NEW.status::text,
        -- Fix: Cast the priority string to priority_level enum
        (CASE 
          WHEN NEW.status = 'cancelled' THEN 'high'
          WHEN NEW.status = 'delivered' THEN 'medium'
          ELSE 'low'
        END)::priority_level,
        NEW.id
      );
    END IF;
    
    -- Notify managers and admins for important status changes
    IF NEW.status IN ('pending_customer_approval', 'cancelled', 'delivered') THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        priority,
        related_id
      )
      SELECT 
        up.id,
        'order_status',
        'Order Status Updated',
        'Order ' || NEW.order_number || ' status changed to ' || NEW.status::text,
        -- Fix: Cast the priority string to priority_level enum
        (CASE 
          WHEN NEW.status = 'cancelled' THEN 'high'
          WHEN NEW.status IN ('pending_customer_approval', 'delivered') THEN 'medium'
          ELSE 'low'
        END)::priority_level,
        NEW.id
      FROM user_profiles up
      WHERE up.role IN ('admin', 'manager')
        AND up.id != NEW.created_by;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
