/*
  # Fix Security and Performance Issues

  ## Changes Made

  ### 1. Add Missing Foreign Key Indexes
  - Added indexes for all unindexed foreign keys to improve query performance
  - Covers: air_freight_carrier_history, air_freight_carriers, order_parts, orders, 
    part_price_history, quotes, sea_freight_price_history, sea_freight_price_list, status_updates

  ### 2. Optimize RLS Policies
  - Updated all RLS policies to use `(select auth.uid())` instead of `auth.uid()`
  - This prevents re-evaluation of auth functions for each row, significantly improving performance at scale
  - Affects: user_profiles, suppliers, parts, orders, order_parts, part_price_history, 
    status_updates, notifications, sea_freight_pricing_records, sea_freight_price_list, 
    sea_freight_price_history, air_freight_carriers, air_freight_carrier_history

  ### 3. Fix Function Search Paths
  - Set immutable search_path for all functions to prevent search path manipulation attacks
  - Covers all custom functions including triggers and utility functions

  ## Security Notes
  - All changes improve query performance and security
  - No data loss or breaking changes
  - RLS policies maintain same access control logic with better performance
*/

-- ============================================================================
-- PART 1: Add Missing Foreign Key Indexes
-- ============================================================================

-- Air freight carrier history indexes
CREATE INDEX IF NOT EXISTS idx_air_freight_carrier_history_changed_by 
  ON public.air_freight_carrier_history(changed_by);

-- Air freight carriers indexes
CREATE INDEX IF NOT EXISTS idx_air_freight_carriers_created_by 
  ON public.air_freight_carriers(created_by);

-- Order parts indexes
CREATE INDEX IF NOT EXISTS idx_order_parts_part_id 
  ON public.order_parts(part_id);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_approved_by 
  ON public.orders(approved_by);

-- Part price history indexes
CREATE INDEX IF NOT EXISTS idx_part_price_history_created_by 
  ON public.part_price_history(created_by);

-- Quotes indexes
CREATE INDEX IF NOT EXISTS idx_quotes_converted_to_order_id 
  ON public.quotes(converted_to_order_id);

-- Sea freight price history indexes
CREATE INDEX IF NOT EXISTS idx_sea_freight_price_history_changed_by 
  ON public.sea_freight_price_history(changed_by);

-- Sea freight price list indexes
CREATE INDEX IF NOT EXISTS idx_sea_freight_price_list_created_by 
  ON public.sea_freight_price_list(created_by);

-- Status updates indexes
CREATE INDEX IF NOT EXISTS idx_status_updates_updated_by 
  ON public.status_updates(updated_by);

-- ============================================================================
-- PART 2: Optimize RLS Policies - User Profiles
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- ============================================================================
-- PART 2: Optimize RLS Policies - Suppliers
-- ============================================================================

DROP POLICY IF EXISTS "Managers can manage suppliers" ON public.suppliers;
CREATE POLICY "Managers can manage suppliers"
  ON public.suppliers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Users can view active suppliers" ON public.suppliers;
CREATE POLICY "Users can view active suppliers"
  ON public.suppliers
  FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
    )
  );

-- ============================================================================
-- PART 2: Optimize RLS Policies - Parts
-- ============================================================================

DROP POLICY IF EXISTS "Authorized users can manage parts" ON public.parts;
CREATE POLICY "Authorized users can manage parts"
  ON public.parts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

-- ============================================================================
-- PART 2: Optimize RLS Policies - Orders
-- ============================================================================

DROP POLICY IF EXISTS "Authorized users can create orders" ON public.orders;
CREATE POLICY "Authorized users can create orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

DROP POLICY IF EXISTS "Authorized users can update orders" ON public.orders;
CREATE POLICY "Authorized users can update orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

DROP POLICY IF EXISTS "Users can view orders based on role" ON public.orders;
CREATE POLICY "Users can view orders based on role"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND (
        role IN ('admin', 'manager') OR
        (role = 'buyer' AND created_by = (select auth.uid())) OR
        role = 'viewer'
      )
    )
  );

-- ============================================================================
-- PART 2: Optimize RLS Policies - Order Parts
-- ============================================================================

DROP POLICY IF EXISTS "Authorized users can manage order parts" ON public.order_parts;
CREATE POLICY "Authorized users can manage order parts"
  ON public.order_parts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

DROP POLICY IF EXISTS "Users can view order parts if they can view the order" ON public.order_parts;
CREATE POLICY "Users can view order parts if they can view the order"
  ON public.order_parts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      INNER JOIN public.user_profiles up ON up.id = (select auth.uid())
      WHERE o.id = order_parts.order_id
      AND (
        up.role IN ('admin', 'manager') OR
        (up.role = 'buyer' AND o.created_by = (select auth.uid())) OR
        up.role = 'viewer'
      )
    )
  );

-- ============================================================================
-- PART 2: Optimize RLS Policies - Part Price History
-- ============================================================================

DROP POLICY IF EXISTS "Authorized users can add price history" ON public.part_price_history;
CREATE POLICY "Authorized users can add price history"
  ON public.part_price_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

-- ============================================================================
-- PART 2: Optimize RLS Policies - Status Updates
-- ============================================================================

DROP POLICY IF EXISTS "Authorized users can create status updates" ON public.status_updates;
CREATE POLICY "Authorized users can create status updates"
  ON public.status_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

DROP POLICY IF EXISTS "Users can view status updates for accessible orders" ON public.status_updates;
CREATE POLICY "Users can view status updates for accessible orders"
  ON public.status_updates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      INNER JOIN public.user_profiles up ON up.id = (select auth.uid())
      WHERE o.id = status_updates.order_id
      AND (
        up.role IN ('admin', 'manager') OR
        (up.role = 'buyer' AND o.created_by = (select auth.uid())) OR
        up.role = 'viewer'
      )
    )
  );

-- ============================================================================
-- PART 2: Optimize RLS Policies - Notifications
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- PART 2: Optimize RLS Policies - Sea Freight Pricing Records
-- ============================================================================

DROP POLICY IF EXISTS "Users can view sea freight pricing for accessible quotes" ON public.sea_freight_pricing_records;
CREATE POLICY "Users can view sea freight pricing for accessible quotes"
  ON public.sea_freight_pricing_records
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      INNER JOIN public.user_profiles up ON up.id = (select auth.uid())
      WHERE q.id = sea_freight_pricing_records.quote_id
      AND (
        up.role IN ('admin', 'manager') OR
        (up.role = 'buyer' AND q.created_by = (select auth.uid())) OR
        up.role = 'viewer'
      )
    )
  );

DROP POLICY IF EXISTS "Authorized users can create sea freight pricing records" ON public.sea_freight_pricing_records;
CREATE POLICY "Authorized users can create sea freight pricing records"
  ON public.sea_freight_pricing_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

DROP POLICY IF EXISTS "Authorized users can update sea freight pricing records" ON public.sea_freight_pricing_records;
CREATE POLICY "Authorized users can update sea freight pricing records"
  ON public.sea_freight_pricing_records
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

DROP POLICY IF EXISTS "Authorized users can delete sea freight pricing records" ON public.sea_freight_pricing_records;
CREATE POLICY "Authorized users can delete sea freight pricing records"
  ON public.sea_freight_pricing_records
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 2: Optimize RLS Policies - Sea Freight Price List
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view active price list" ON public.sea_freight_price_list;
CREATE POLICY "Authenticated users can view active price list"
  ON public.sea_freight_price_list
  FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authorized users can create price list items" ON public.sea_freight_price_list;
CREATE POLICY "Authorized users can create price list items"
  ON public.sea_freight_price_list
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

DROP POLICY IF EXISTS "Authorized users can update price list items" ON public.sea_freight_price_list;
CREATE POLICY "Authorized users can update price list items"
  ON public.sea_freight_price_list
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

DROP POLICY IF EXISTS "Admins and managers can delete price list items" ON public.sea_freight_price_list;
CREATE POLICY "Admins and managers can delete price list items"
  ON public.sea_freight_price_list
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 2: Optimize RLS Policies - Sea Freight Price History
-- ============================================================================

DROP POLICY IF EXISTS "Users can view price history" ON public.sea_freight_price_history;
CREATE POLICY "Users can view price history"
  ON public.sea_freight_price_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
    )
  );

-- ============================================================================
-- PART 2: Optimize RLS Policies - Air Freight Carriers
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view active carriers" ON public.air_freight_carriers;
CREATE POLICY "Authenticated users can view active carriers"
  ON public.air_freight_carriers
  FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authorized users can create carriers" ON public.air_freight_carriers;
CREATE POLICY "Authorized users can create carriers"
  ON public.air_freight_carriers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

DROP POLICY IF EXISTS "Authorized users can update carriers" ON public.air_freight_carriers;
CREATE POLICY "Authorized users can update carriers"
  ON public.air_freight_carriers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

DROP POLICY IF EXISTS "Admins and managers can delete carriers" ON public.air_freight_carriers;
CREATE POLICY "Admins and managers can delete carriers"
  ON public.air_freight_carriers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- PART 2: Optimize RLS Policies - Air Freight Carrier History
-- ============================================================================

DROP POLICY IF EXISTS "Users can view carrier history" ON public.air_freight_carrier_history;
CREATE POLICY "Users can view carrier history"
  ON public.air_freight_carrier_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
    )
  );

-- ============================================================================
-- PART 3: Fix Function Search Paths
-- ============================================================================

-- Set search_path for all functions to prevent search path manipulation attacks
ALTER FUNCTION public.get_users_by_roles SET search_path = public, pg_temp;
ALTER FUNCTION public.uid SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin SET search_path = public, pg_temp;
ALTER FUNCTION public.update_order_total SET search_path = public, pg_temp;
ALTER FUNCTION public.log_status_change SET search_path = public, pg_temp;
ALTER FUNCTION public.check_low_stock SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_order_status_change SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_low_stock SET search_path = public, pg_temp;
ALTER FUNCTION public.get_sea_freight_pricing_analytics SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_price_change SET search_path = public, pg_temp;
ALTER FUNCTION public.archive_sea_freight_price_change SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_quote_number SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_quote_totals SET search_path = public, pg_temp;
ALTER FUNCTION public.get_active_sea_freight_prices SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_profit_margin SET search_path = public, pg_temp;
ALTER FUNCTION public.get_sea_freight_price_history SET search_path = public, pg_temp;
ALTER FUNCTION public.archive_air_freight_carrier_change SET search_path = public, pg_temp;
ALTER FUNCTION public.get_air_freight_carrier_history SET search_path = public, pg_temp;
