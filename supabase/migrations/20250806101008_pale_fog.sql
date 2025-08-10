/*
  # Create notification triggers for real-time updates

  1. Trigger Functions
    - `notify_order_status_change()` - Creates notifications when order status changes
    - `notify_low_stock()` - Creates notifications when parts go below minimum stock
    - `notify_price_change()` - Creates notifications when part prices are updated

  2. Triggers
    - Order status change notifications
    - Low stock alerts
    - Price change notifications

  3. Helper Functions
    - Functions to get users by role for targeted notifications
*/

-- Function to get all users with specific roles
CREATE OR REPLACE FUNCTION get_users_by_roles(role_names text[])
RETURNS TABLE(user_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT up.id
  FROM user_profiles up
  WHERE up.role = ANY(role_names);
END;
$$ LANGUAGE plpgsql;

-- Function to create notification for order status changes
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_title text;
  notification_message text;
  target_user_id uuid;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Create notification title and message based on status
  CASE NEW.status
    WHEN 'pending_customer_approval' THEN
      notification_title := 'Order Requires Approval';
      notification_message := 'Order ' || NEW.order_number || ' ($' || NEW.total_amount || ') is pending management approval.';
    WHEN 'approved' THEN
      notification_title := 'Order Approved';
      notification_message := 'Order ' || NEW.order_number || ' has been approved and is ready to be sent to supplier.';
    WHEN 'ordered' THEN
      notification_title := 'Order Sent to Supplier';
      notification_message := 'Order ' || NEW.order_number || ' has been sent to the supplier.';
    WHEN 'in_transit' THEN
      notification_title := 'Order In Transit';
      notification_message := 'Order ' || NEW.order_number || ' is now in transit from the supplier.';
    WHEN 'delivered' THEN
      notification_title := 'Order Delivered';
      notification_message := 'Order ' || NEW.order_number || ' has been successfully delivered and received.';
    WHEN 'cancelled' THEN
      notification_title := 'Order Cancelled';
      notification_message := 'Order ' || NEW.order_number || ' has been cancelled.';
    ELSE
      notification_title := 'Order Status Updated';
      notification_message := 'Order ' || NEW.order_number || ' status has been updated to ' || NEW.status || '.';
  END CASE;

  -- Notify the order creator
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, priority, related_id)
    VALUES (
      NEW.created_by,
      'order_status',
      notification_title,
      notification_message,
      CASE 
        WHEN NEW.status = 'pending_customer_approval' THEN 'medium'::priority_level
        WHEN NEW.status = 'cancelled' THEN 'high'::priority_level
        ELSE 'low'::priority_level
      END,
      NEW.id
    );
  END IF;

  -- For approval status, also notify managers and admins
  IF NEW.status = 'pending_customer_approval' THEN
    INSERT INTO notifications (user_id, type, title, message, priority, related_id)
    SELECT 
      user_id,
      'approval',
      notification_title,
      notification_message,
      'medium'::priority_level,
      NEW.id
    FROM get_users_by_roles(ARRAY['admin', 'manager'])
    WHERE user_id != COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create notifications for low stock
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if stock went from above minimum to at or below minimum
  IF OLD.current_stock > OLD.min_stock AND NEW.current_stock <= NEW.min_stock THEN
    -- Notify managers, admins, and buyers about low stock
    INSERT INTO notifications (user_id, type, title, message, priority, related_id)
    SELECT 
      user_id,
      'low_stock',
      'Low Stock Alert',
      NEW.name || ' (' || NEW.part_number || ') is running low. Current stock: ' || NEW.current_stock || ' units (Min: ' || NEW.min_stock || ')',
      'high'::priority_level,
      NEW.id
    FROM get_users_by_roles(ARRAY['admin', 'manager', 'buyer']);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create notifications for price changes
CREATE OR REPLACE FUNCTION notify_price_change()
RETURNS TRIGGER AS $$
DECLARE
  part_name text;
  part_number text;
  price_change_percent numeric;
  old_price numeric;
BEGIN
  -- Get part information
  SELECT name, part_number INTO part_name, part_number
  FROM parts WHERE id = NEW.part_id;

  -- Get the previous price for this part
  SELECT price INTO old_price
  FROM part_price_history
  WHERE part_id = NEW.part_id 
    AND effective_date < NEW.effective_date
  ORDER BY effective_date DESC
  LIMIT 1;

  -- Calculate price change percentage if we have a previous price
  IF old_price IS NOT NULL AND old_price > 0 THEN
    price_change_percent := ((NEW.price - old_price) / old_price) * 100;
    
    -- Only notify for significant price changes (>5% change)
    IF ABS(price_change_percent) > 5 THEN
      -- Notify managers, admins, and buyers about significant price changes
      INSERT INTO notifications (user_id, type, title, message, priority, related_id)
      SELECT 
        user_id,
        'price_change',
        'Significant Price Change',
        'New pricing for ' || part_name || ' (' || part_number || ') - ' || 
        CASE 
          WHEN price_change_percent > 0 THEN '+' || ROUND(price_change_percent, 1) || '% increase'
          ELSE ROUND(ABS(price_change_percent), 1) || '% decrease'
        END || ' from ' || NEW.supplier_name || '.',
        CASE 
          WHEN ABS(price_change_percent) > 20 THEN 'high'::priority_level
          WHEN ABS(price_change_percent) > 10 THEN 'medium'::priority_level
          ELSE 'low'::priority_level
        END,
        NEW.part_id
      FROM get_users_by_roles(ARRAY['admin', 'manager', 'buyer']);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS notify_order_status_change_trigger ON orders;
CREATE TRIGGER notify_order_status_change_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_status_change();

DROP TRIGGER IF EXISTS notify_low_stock_trigger ON parts;
CREATE TRIGGER notify_low_stock_trigger
  AFTER UPDATE ON parts
  FOR EACH ROW
  EXECUTE FUNCTION notify_low_stock();

DROP TRIGGER IF EXISTS notify_price_change_trigger ON part_price_history;
CREATE TRIGGER notify_price_change_trigger
  AFTER INSERT ON part_price_history
  FOR EACH ROW
  EXECUTE FUNCTION notify_price_change();