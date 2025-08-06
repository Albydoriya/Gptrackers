/*
  # Create sample notifications for testing

  1. Sample Notifications
    - Creates sample notifications for different users and scenarios
    - Demonstrates various notification types and priorities
    - Provides realistic test data for the notification system

  2. Test Data
    - Order status notifications
    - Low stock alerts
    - Price change notifications
    - Delivery notifications
    - System notifications
*/

-- Insert sample notifications for testing
-- Note: Replace the user_id values with actual user IDs from your user_profiles table

-- Sample order status notifications
INSERT INTO notifications (user_id, type, title, message, priority, related_id) VALUES
-- You'll need to replace these UUIDs with actual user IDs from your system
(
  (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1),
  'order_status',
  'Order Status Updated',
  'Order ORD-2024-001 has been marked as "In Transit" by the supplier.',
  'medium',
  (SELECT id FROM orders LIMIT 1)
),
(
  (SELECT id FROM user_profiles WHERE role = 'manager' LIMIT 1),
  'approval',
  'Order Requires Approval',
  'Order ORD-2024-003 ($2,575.00) is pending management approval.',
  'medium',
  (SELECT id FROM orders OFFSET 1 LIMIT 1)
);

-- Sample low stock notifications for all managers, admins, and buyers
INSERT INTO notifications (user_id, type, title, message, priority, related_id)
SELECT 
  up.id,
  'low_stock',
  'Low Stock Alert',
  p.name || ' (' || p.part_number || ') is running low. Current stock: ' || p.current_stock || ' units (Min: ' || p.min_stock || ')',
  'high',
  p.id
FROM user_profiles up
CROSS JOIN (SELECT * FROM parts WHERE current_stock <= min_stock LIMIT 1) p
WHERE up.role IN ('admin', 'manager', 'buyer');

-- Sample price change notifications
INSERT INTO notifications (user_id, type, title, message, priority, related_id)
SELECT 
  up.id,
  'price_change',
  'Price Update Available',
  'New pricing received from supplier for ' || p.name || ' - check for potential savings.',
  'low',
  p.id
FROM user_profiles up
CROSS JOIN (SELECT * FROM parts LIMIT 1) p
WHERE up.role IN ('admin', 'manager', 'buyer');

-- Sample delivery notifications
INSERT INTO notifications (user_id, type, title, message, priority, related_id)
SELECT 
  up.id,
  'delivery',
  'Delivery Completed',
  'Order ' || o.order_number || ' has been successfully delivered and received.',
  'medium',
  o.id
FROM user_profiles up
CROSS JOIN (SELECT * FROM orders WHERE status = 'delivered' LIMIT 1) o
WHERE up.role IN ('admin', 'manager', 'buyer');

-- Sample system notification for all users
INSERT INTO notifications (user_id, type, title, message, priority)
SELECT 
  id,
  'system',
  'System Maintenance Scheduled',
  'Scheduled maintenance will occur tonight from 2:00 AM - 4:00 AM AEST. The system may be temporarily unavailable.',
  'low'
FROM user_profiles;