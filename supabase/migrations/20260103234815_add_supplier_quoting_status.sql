/*
  # Add Supplier Quoting Status to Order Status Enum

  1. Changes
    - Add 'supplier_quoting' status to order_status enum
    - This status represents orders that have been sent to suppliers for price quotes
    - Positioned between 'approved' and 'ordered' in the workflow

  2. Status Flow
    draft → pending_customer_approval → approved → supplier_quoting → ordered → in_transit → delivered
                                                         ↓
                                                     cancelled
*/

-- Add new status to order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'supplier_quoting' AFTER 'approved';
