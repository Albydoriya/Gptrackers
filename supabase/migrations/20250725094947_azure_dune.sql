/*
  # Seed Initial Data for Parts Tracking System

  1. Sample Data
    - Initial suppliers
    - Sample parts catalog
    - Demo user profiles
    - Sample orders for testing

  2. Test Data
    - Realistic pricing history
    - Various order statuses
    - Sample notifications
*/

-- Insert sample suppliers
INSERT INTO suppliers (id, name, contact_person, email, phone, address, rating, delivery_time, payment_terms, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'TechParts Inc.', 'John Smith', 'john.smith@techparts.com', '+1 555 0101', '123 Industrial Ave, Tech City, TC 12345', 4.8, 3, 'Net 30', true),
  ('550e8400-e29b-41d4-a716-446655440002', 'Global Components Ltd.', 'Sarah Johnson', 'sarah.j@globalcomp.com', '+1 555 0202', '456 Supply Chain Blvd, Logistics, LG 67890', 4.5, 5, 'Net 45', true),
  ('550e8400-e29b-41d4-a716-446655440003', 'Precision Manufacturing', 'Mike Chen', 'mike.chen@precision.com', '+1 555 0303', '789 Manufacturing St, Production, PR 11111', 4.9, 2, 'Net 15', true),
  ('550e8400-e29b-41d4-a716-446655440004', 'Electronic Solutions', 'Lisa Wang', 'lisa.wang@electronicsol.com', '+1 555 0404', '321 Circuit Rd, Silicon Valley, SV 22222', 4.6, 4, 'Net 30', true),
  ('550e8400-e29b-41d4-a716-446655440005', 'Industrial Supplies Co.', 'Robert Brown', 'robert.brown@industrialsupplies.com', '+1 555 0505', '654 Factory Lane, Industrial Park, IP 33333', 4.3, 7, 'Net 60', true);

-- Insert sample parts
INSERT INTO parts (id, part_number, name, description, category, specifications, current_stock, min_stock, preferred_suppliers) VALUES
  ('650e8400-e29b-41d4-a716-446655440001', 'CPU-001', 'High-Performance Processor', 'Advanced 8-core processor for industrial applications', 'Electronics', '{"Clock Speed": "3.2 GHz", "Cores": "8", "Architecture": "x86-64", "TDP": "65W"}', 45, 20, '{"550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440003"}'),
  ('650e8400-e29b-41d4-a716-446655440002', 'MEM-512', 'Memory Module 32GB', 'DDR4 32GB memory module for high-performance systems', 'Memory', '{"Capacity": "32GB", "Type": "DDR4", "Speed": "3200 MHz", "Voltage": "1.2V"}', 80, 30, '{"550e8400-e29b-41d4-a716-446655440002", "550e8400-e29b-41d4-a716-446655440003"}'),
  ('650e8400-e29b-41d4-a716-446655440003', 'SSD-1TB', 'Solid State Drive 1TB', 'Enterprise-grade NVMe SSD with high durability', 'Storage', '{"Capacity": "1TB", "Interface": "NVMe PCIe 4.0", "Read Speed": "7000 MB/s", "Write Speed": "6000 MB/s"}', 60, 25, '{"550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"}'),
  ('650e8400-e29b-41d4-a716-446655440004', 'NET-GIG', 'Gigabit Network Card', 'High-speed ethernet adapter for server applications', 'Networking', '{"Speed": "1 Gbps", "Interface": "PCIe x4", "Ports": "2", "Protocol": "TCP/IP"}', 35, 15, '{"550e8400-e29b-41d4-a716-446655440004"}'),
  ('650e8400-e29b-41d4-a716-446655440005', 'PWR-500', 'Power Supply 500W', 'Modular power supply with 80+ Gold certification', 'Electronics', '{"Wattage": "500W", "Efficiency": "80+ Gold", "Modular": "Yes", "Connectors": "Multiple"}', 25, 10, '{"550e8400-e29b-41d4-a716-446655440005"}'),
  ('650e8400-e29b-41d4-a716-446655440006', 'CAB-ETH', 'Ethernet Cable 5m', 'Cat6 ethernet cable for network connections', 'Cables', '{"Length": "5m", "Category": "Cat6", "Shielding": "UTP", "Connector": "RJ45"}', 150, 50, '{"550e8400-e29b-41d4-a716-446655440004", "550e8400-e29b-41d4-a716-446655440005"}'),
  ('650e8400-e29b-41d4-a716-446655440007', 'FAN-120', 'Cooling Fan 120mm', 'High-performance cooling fan for industrial use', 'Hardware', '{"Size": "120mm", "Speed": "1800 RPM", "Noise": "25 dBA", "Bearing": "Fluid Dynamic"}', 40, 20, '{"550e8400-e29b-41d4-a716-446655440003", "550e8400-e29b-41d4-a716-446655440005"}'),
  ('650e8400-e29b-41d4-a716-446655440008', 'SEN-TEMP', 'Temperature Sensor', 'Digital temperature sensor with high accuracy', 'Electronics', '{"Range": "-40°C to +125°C", "Accuracy": "±0.5°C", "Interface": "I2C", "Resolution": "12-bit"}', 18, 25, '{"550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440004"}');

-- Insert price history for parts
INSERT INTO part_price_history (part_id, price, supplier_name, quantity, effective_date, reason) VALUES
  ('650e8400-e29b-41d4-a716-446655440001', 285.00, 'TechParts Inc.', 10, '2024-01-15', 'Initial pricing'),
  ('650e8400-e29b-41d4-a716-446655440001', 275.00, 'TechParts Inc.', 25, '2024-02-20', 'Volume discount'),
  ('650e8400-e29b-41d4-a716-446655440001', 290.00, 'Global Components Ltd.', 15, '2024-03-10', 'Market price change'),
  ('650e8400-e29b-41d4-a716-446655440002', 145.00, 'Global Components Ltd.', 20, '2024-01-10', 'Initial pricing'),
  ('650e8400-e29b-41d4-a716-446655440002', 140.00, 'TechParts Inc.', 30, '2024-02-15', 'Competitive pricing'),
  ('650e8400-e29b-41d4-a716-446655440002', 138.00, 'Precision Manufacturing', 40, '2024-03-05', 'New supplier quote'),
  ('650e8400-e29b-41d4-a716-446655440003', 125.00, 'TechParts Inc.', 15, '2024-01-20', 'Initial pricing'),
  ('650e8400-e29b-41d4-a716-446655440003', 118.00, 'Global Components Ltd.', 25, '2024-02-25', 'Price negotiation'),
  ('650e8400-e29b-41d4-a716-446655440003', 115.00, 'Precision Manufacturing', 35, '2024-03-15', 'Volume discount'),
  ('650e8400-e29b-41d4-a716-446655440004', 85.00, 'Electronic Solutions', 20, '2024-01-25', 'Initial pricing'),
  ('650e8400-e29b-41d4-a716-446655440004', 82.00, 'Electronic Solutions', 30, '2024-03-01', 'Price reduction'),
  ('650e8400-e29b-41d4-a716-446655440005', 95.00, 'Industrial Supplies Co.', 15, '2024-02-01', 'Initial pricing'),
  ('650e8400-e29b-41d4-a716-446655440006', 12.50, 'Electronic Solutions', 100, '2024-01-30', 'Initial pricing'),
  ('650e8400-e29b-41d4-a716-446655440006', 11.80, 'Industrial Supplies Co.', 150, '2024-03-05', 'Bulk pricing'),
  ('650e8400-e29b-41d4-a716-446655440007', 25.00, 'Precision Manufacturing', 50, '2024-02-10', 'Initial pricing'),
  ('650e8400-e29b-41d4-a716-446655440008', 45.00, 'TechParts Inc.', 25, '2024-02-15', 'Initial pricing');

-- Note: Sample orders and other data will be created through the application
-- as they require authenticated users which will be created when users sign up