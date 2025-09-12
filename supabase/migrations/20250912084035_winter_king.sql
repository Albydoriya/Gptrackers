```sql
-- This function calculates the total amounts for a quote, including bid items, shipping, fees, subtotal, GST, and grand total.
-- It is triggered by changes in both the 'quotes' and 'quote_parts' tables.

CREATE OR REPLACE FUNCTION public.calculate_quote_totals()
RETURNS TRIGGER AS $$
DECLARE
    quote_id_to_update UUID;
    total_bid_items_cost_val NUMERIC(12,2);
    shipping_cost_sea_val NUMERIC(12,2);
    shipping_cost_air_val NUMERIC(12,2);
    selected_shipping_method_val TEXT;
    agent_fees_val NUMERIC(12,2);
    local_shipping_fees_val NUMERIC(12,2);
    gst_rate NUMERIC(5,2) := 0.10; -- 10% GST
BEGIN
    -- Determine the quote_id based on which table triggered the function
    IF TG_TABLE_NAME = 'quotes' THEN
        quote_id_to_update := NEW.id;
    ELSIF TG_TABLE_NAME = 'quote_parts' THEN
        quote_id_to_update := NEW.quote_id;
    ELSE
        -- This case should ideally not be reached if triggers are set up correctly
        RAISE EXCEPTION 'Function calculate_quote_totals called from an unexpected table: %', TG_TABLE_NAME;
    END IF;

    -- Get current quote details
    SELECT
        q.shipping_cost_sea,
        q.shipping_cost_air,
        q.selected_shipping_method,
        q.agent_fees,
        q.local_shipping_fees
    INTO
        shipping_cost_sea_val,
        shipping_cost_air_val,
        selected_shipping_method_val,
        agent_fees_val,
        local_shipping_fees_val
    FROM
        public.quotes q
    WHERE
        q.id = quote_id_to_update;

    -- Calculate total bid items cost from quote_parts
    SELECT
        COALESCE(SUM(qp.total_price), 0)
    INTO
        total_bid_items_cost_val
    FROM
        public.quote_parts qp
    WHERE
        qp.quote_id = quote_id_to_update;

    -- Calculate subtotal
    -- Subtotal = Total Bid Items Cost + Selected Shipping Cost + Agent Fees + Local Shipping Fees
    DECLARE
        current_shipping_cost NUMERIC(12,2);
    BEGIN
        IF selected_shipping_method_val = 'sea' THEN
            current_shipping_cost := shipping_cost_sea_val;
        ELSIF selected_shipping_method_val = 'air' THEN
            current_shipping_cost := shipping_cost_air_val;
        ELSE
            current_shipping_cost := 0; -- Default or error case
        END IF;

        -- Ensure all components are non-negative before summing
        total_bid_items_cost_val := GREATEST(0, total_bid_items_cost_val);
        current_shipping_cost := GREATEST(0, current_shipping_cost);
        agent_fees_val := GREATEST(0, agent_fees_val);
        local_shipping_fees_val := GREATEST(0, local_shipping_fees_val);

        UPDATE public.quotes
        SET
            total_bid_items_cost = total_bid_items_cost_val,
            subtotal_amount = total_bid_items_cost_val + current_shipping_cost + agent_fees_val + local_shipping_fees_val,
            gst_amount = (total_bid_items_cost_val + current_shipping_cost + agent_fees_val + local_shipping_fees_val) * gst_rate,
            grand_total_amount = (total_bid_items_cost_val + current_shipping_cost + agent_fees_val + local_shipping_fees_val) * (1 + gst_rate)
        WHERE
            id = quote_id_to_update;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers to recreate them with the updated function
DROP TRIGGER IF EXISTS calculate_quote_totals_on_insert ON public.quote_parts;
DROP TRIGGER IF EXISTS calculate_quote_totals_on_update ON public.quote_parts;
DROP TRIGGER IF EXISTS calculate_quote_totals_on_delete ON public.quote_parts;
DROP TRIGGER IF EXISTS recalculate_quote_totals_on_quote_update ON public.quotes;

-- Recreate triggers for quote_parts
CREATE TRIGGER calculate_quote_totals_on_insert
AFTER INSERT ON public.quote_parts
FOR EACH ROW EXECUTE FUNCTION public.calculate_quote_totals();

CREATE TRIGGER calculate_quote_totals_on_update
AFTER UPDATE ON public.quote_parts
FOR EACH ROW EXECUTE FUNCTION public.calculate_quote_totals();

CREATE TRIGGER calculate_quote_totals_on_delete
AFTER DELETE ON public.quote_parts
FOR EACH ROW EXECUTE FUNCTION public.calculate_quote_totals();

-- Recreate trigger for quotes
CREATE TRIGGER recalculate_quote_totals_on_quote_update
AFTER UPDATE OF selected_shipping_method, shipping_cost_sea, shipping_cost_air, agent_fees, local_shipping_fees ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.calculate_quote_totals();
```