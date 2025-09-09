/*
  # Fix Users Table References

  1. Database Functions
    - Update functions to use correct table references
    - Fix any references to non-existent 'users' table
    - Use 'auth.users' for authentication data or 'user_profiles' for profile data

  2. Security Policies
    - Update RLS policies to use correct table references
    - Add helper function for checking user authentication

  3. Triggers
    - Ensure all triggers reference correct tables
*/

-- Create helper function to get current user ID
CREATE OR REPLACE FUNCTION uid() RETURNS uuid AS $$
  SELECT auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Update the update_updated_at_column function (if it exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the update_order_total function
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the total_amount in orders table based on order_parts
  UPDATE orders 
  SET total_amount = (
    SELECT COALESCE(SUM(total_price), 0)
    FROM order_parts 
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
  )
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Update the log_status_change function
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO status_updates (
      order_id,
      old_status,
      new_status,
      notes,
      updated_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.notes,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the check_low_stock function
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if stock level is at or below minimum
  IF NEW.current_stock <= NEW.min_stock AND OLD.current_stock > OLD.min_stock THEN
    -- This part is now low stock, could trigger notifications here
    -- For now, just log it
    RAISE NOTICE 'Part % (%) is now low stock: % <= %', NEW.name, NEW.part_number, NEW.current_stock, NEW.min_stock;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the notify_order_status_change function
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
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
        CASE 
          WHEN NEW.status = 'cancelled' THEN 'high'
          WHEN NEW.status = 'delivered' THEN 'medium'
          ELSE 'low'
        END,
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
        'Order Requires Attention',
        'Order ' || NEW.order_number || ' is now ' || NEW.status::text || 
        CASE 
          WHEN user_profile.full_name IS NOT NULL 
          THEN ' (requested by ' || user_profile.full_name || ')'
          ELSE ''
        END,
        'high',
        NEW.id
      FROM user_profiles up
      WHERE up.role IN ('admin', 'manager') 
        AND up.id != NEW.created_by; -- Don't notify the creator twice
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the notify_low_stock function
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if stock level dropped to or below minimum
  IF NEW.current_stock <= NEW.min_stock AND 
     (OLD.current_stock IS NULL OR OLD.current_stock > OLD.min_stock) THEN
    
    -- Notify managers and admins about low stock
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
      'low_stock',
      'Low Stock Alert',
      'Part ' || NEW.name || ' (' || NEW.part_number || ') is running low. ' ||
      'Current stock: ' || NEW.current_stock || ', Minimum: ' || NEW.min_stock,
      CASE 
        WHEN NEW.current_stock = 0 THEN 'high'
        WHEN NEW.current_stock < NEW.min_stock THEN 'high'
        ELSE 'medium'
      END,
      NEW.id
    FROM user_profiles up
    WHERE up.role IN ('admin', 'manager', 'buyer');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the notify_price_change function
CREATE OR REPLACE FUNCTION notify_price_change()
RETURNS TRIGGER AS $$
DECLARE
  part_info RECORD;
  user_profile RECORD;
BEGIN
  -- Get part information
  SELECT name, part_number INTO part_info
  FROM parts 
  WHERE id = NEW.part_id;
  
  -- Get user profile information for the person who made the change
  SELECT full_name INTO user_profile
  FROM user_profiles 
  WHERE id = NEW.created_by;
  
  -- Notify relevant users about price changes
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
    'price_change',
    'Part Price Updated',
    'Price for ' || COALESCE(part_info.name, 'Unknown Part') || 
    ' (' || COALESCE(part_info.part_number, 'Unknown') || ') ' ||
    'updated to $' || NEW.price::text || 
    CASE 
      WHEN user_profile.full_name IS NOT NULL 
      THEN ' by ' || user_profile.full_name
      ELSE ''
    END ||
    CASE 
      WHEN NEW.reason IS NOT NULL 
      THEN '. Reason: ' || NEW.reason
      ELSE ''
    END,
    'medium',
    NEW.part_id
  FROM user_profiles up
  WHERE up.role IN ('admin', 'manager', 'buyer')
    AND up.id != NEW.created_by; -- Don't notify the person who made the change
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix any foreign key constraints that might be referencing the wrong table
-- Update foreign key constraints to reference auth.users instead of users
DO $$
BEGIN
  -- Check if any foreign keys reference a non-existent users table and fix them
  
  -- Fix part_price_history.created_by if it exists and references wrong table
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'part_price_history_created_by_fkey'
    AND table_name = 'part_price_history'
  ) THEN
    ALTER TABLE part_price_history DROP CONSTRAINT IF EXISTS part_price_history_created_by_fkey;
    ALTER TABLE part_price_history ADD CONSTRAINT part_price_history_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;
  
  -- Fix orders.created_by if it exists and references wrong table
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_created_by_fkey'
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_created_by_fkey;
    ALTER TABLE orders ADD CONSTRAINT orders_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES auth.users(id);
  END IF;
  
  -- Fix orders.approved_by if it exists and references wrong table
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_approved_by_fkey'
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_approved_by_fkey;
    ALTER TABLE orders ADD CONSTRAINT orders_approved_by_fkey 
      FOREIGN KEY (approved_by) REFERENCES auth.users(id);
  END IF;
  
  -- Fix status_updates.updated_by if it exists and references wrong table
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'status_updates_updated_by_fkey'
    AND table_name = 'status_updates'
  ) THEN
    ALTER TABLE status_updates DROP CONSTRAINT IF EXISTS status_updates_updated_by_fkey;
    ALTER TABLE status_updates ADD CONSTRAINT status_updates_updated_by_fkey 
      FOREIGN KEY (updated_by) REFERENCES auth.users(id);
  END IF;
  
  -- Fix notifications.user_id if it exists and references wrong table
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'notifications_user_id_fkey'
    AND table_name = 'notifications'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
    ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  -- Fix user_profiles.id if it exists and references wrong table
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_profiles_id_fkey'
    AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_id_fkey 
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

END $$;

-- Update any RLS policies that might be referencing the wrong table
-- Drop and recreate policies that might have incorrect references

-- Update user_profiles policies
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;

CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Ensure all other policies use the correct uid() function
-- Update suppliers policies
DROP POLICY IF EXISTS "Managers can manage suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can view active suppliers" ON suppliers;

CREATE POLICY "Managers can manage suppliers"
  ON suppliers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can view active suppliers"
  ON suppliers
  FOR SELECT
  TO authenticated
  USING (
    is_active = true OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Update parts policies
DROP POLICY IF EXISTS "Authorized users can manage parts" ON parts;
DROP POLICY IF EXISTS "Users can view parts" ON parts;

CREATE POLICY "Authorized users can manage parts"
  ON parts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

CREATE POLICY "Users can view parts"
  ON parts
  FOR SELECT
  TO authenticated
  USING (true);

-- Update orders policies
DROP POLICY IF EXISTS "Authorized users can create orders" ON orders;
DROP POLICY IF EXISTS "Authorized users can update orders" ON orders;
DROP POLICY IF EXISTS "Users can view orders based on role" ON orders;

CREATE POLICY "Authorized users can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

CREATE POLICY "Authorized users can update orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    ) OR (
      created_by = auth.uid() AND 
      status IN ('draft', 'pending_customer_approval')
    )
  );

CREATE POLICY "Users can view orders based on role"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    ) OR created_by = auth.uid()
  );

-- Update order_parts policies
DROP POLICY IF EXISTS "Authorized users can manage order parts" ON order_parts;
DROP POLICY IF EXISTS "Users can view order parts if they can view the order" ON order_parts;

CREATE POLICY "Authorized users can manage order parts"
  ON order_parts
  FOR ALL
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'manager', 'buyer')
        ) OR created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view order parts if they can view the order"
  ON order_parts
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'manager')
        ) OR created_by = auth.uid()
      )
    )
  );

-- Update part_price_history policies
DROP POLICY IF EXISTS "Authorized users can add price history" ON part_price_history;
DROP POLICY IF EXISTS "Users can view price history" ON part_price_history;

CREATE POLICY "Authorized users can add price history"
  ON part_price_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

CREATE POLICY "Users can view price history"
  ON part_price_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Update status_updates policies
DROP POLICY IF EXISTS "Authorized users can create status updates" ON status_updates;
DROP POLICY IF EXISTS "Users can view status updates for accessible orders" ON status_updates;

CREATE POLICY "Authorized users can create status updates"
  ON status_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

CREATE POLICY "Users can view status updates for accessible orders"
  ON status_updates
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'manager')
        ) OR created_by = auth.uid()
      )
    )
  );

-- Update notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);