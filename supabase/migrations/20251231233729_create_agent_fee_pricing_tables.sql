/*
  # Create Agent Fee Pricing Tables

  ## Changes

  1. New Tables
    - `agent_fees`
      - Stores agent fee pricing information
      - Links to suppliers table via supplier_id
      - Tracks fee amounts, effective dates, and status
    - `agent_fees_history`
      - Tracks historical changes to agent fees
      - Records reasons for changes and timestamps

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to view active fees
    - Add policies for authorized users (admin, manager, buyer) to manage fees

  3. Functions
    - Create trigger function to archive agent fee changes to history table
    - Create function to retrieve agent fee history

  4. Indexes
    - Add indexes for supplier_id and foreign key relationships
    - Add indexes for common query patterns
*/

-- ============================================================================
-- Create agent_fees table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agent_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  fee_amount decimal(10,2) NOT NULL CHECK (fee_amount >= 0),
  fee_type text NOT NULL DEFAULT 'percentage' CHECK (fee_type IN ('percentage', 'fixed')),
  currency text NOT NULL DEFAULT 'AUD',
  is_active boolean DEFAULT true,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  expiration_date date,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_expiration_date CHECK (expiration_date IS NULL OR expiration_date > effective_date)
);

-- ============================================================================
-- Create agent_fees_history table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agent_fees_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_fee_id uuid NOT NULL REFERENCES public.agent_fees(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL,
  agent_name text NOT NULL,
  fee_amount decimal(10,2) NOT NULL,
  fee_type text NOT NULL,
  currency text NOT NULL,
  change_reason text,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now()
);

-- ============================================================================
-- Create indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_agent_fees_supplier_id ON public.agent_fees(supplier_id);
CREATE INDEX IF NOT EXISTS idx_agent_fees_is_active ON public.agent_fees(is_active);
CREATE INDEX IF NOT EXISTS idx_agent_fees_created_by ON public.agent_fees(created_by);
CREATE INDEX IF NOT EXISTS idx_agent_fees_effective_date ON public.agent_fees(effective_date);
CREATE INDEX IF NOT EXISTS idx_agent_fees_history_agent_fee_id ON public.agent_fees_history(agent_fee_id);
CREATE INDEX IF NOT EXISTS idx_agent_fees_history_changed_by ON public.agent_fees_history(changed_by);

-- ============================================================================
-- Enable Row Level Security
-- ============================================================================

ALTER TABLE public.agent_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_fees_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Create RLS Policies for agent_fees
-- ============================================================================

CREATE POLICY "Authenticated users can view active agent fees"
  ON public.agent_fees
  FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Authorized users can create agent fees"
  ON public.agent_fees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

CREATE POLICY "Authorized users can update agent fees"
  ON public.agent_fees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'manager', 'buyer')
    )
  );

CREATE POLICY "Admins and managers can delete agent fees"
  ON public.agent_fees
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
-- Create RLS Policies for agent_fees_history
-- ============================================================================

CREATE POLICY "Users can view agent fee history"
  ON public.agent_fees_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (select auth.uid())
    )
  );

-- ============================================================================
-- Create trigger function to archive agent fee changes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.archive_agent_fee_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.fee_amount != NEW.fee_amount OR OLD.fee_type != NEW.fee_type) THEN
      INSERT INTO public.agent_fees_history (
        agent_fee_id,
        supplier_id,
        agent_name,
        fee_amount,
        fee_type,
        currency,
        change_reason,
        changed_by,
        changed_at
      ) VALUES (
        OLD.id,
        OLD.supplier_id,
        OLD.agent_name,
        OLD.fee_amount,
        OLD.fee_type,
        OLD.currency,
        COALESCE(NEW.notes, 'Fee amount or type changed'),
        NEW.created_by,
        now()
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Create trigger
-- ============================================================================

DROP TRIGGER IF EXISTS agent_fee_change_trigger ON public.agent_fees;
CREATE TRIGGER agent_fee_change_trigger
  AFTER UPDATE ON public.agent_fees
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_agent_fee_change();

-- ============================================================================
-- Create function to get agent fee history
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_agent_fee_history(p_agent_fee_id uuid)
RETURNS TABLE (
  id uuid,
  agent_name text,
  fee_amount decimal,
  fee_type text,
  currency text,
  change_reason text,
  changed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.agent_name,
    h.fee_amount,
    h.fee_type,
    h.currency,
    h.change_reason,
    h.changed_at
  FROM public.agent_fees_history h
  WHERE h.agent_fee_id = p_agent_fee_id
  ORDER BY h.changed_at DESC;
END;
$$;

-- ============================================================================
-- Create updated_at trigger
-- ============================================================================

DROP TRIGGER IF EXISTS update_agent_fees_updated_at ON public.agent_fees;
CREATE TRIGGER update_agent_fees_updated_at
  BEFORE UPDATE ON public.agent_fees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
