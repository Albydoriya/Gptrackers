/*
  # Fix Order Export History Constraint

  1. Changes
    - Update export_type_check constraint to support multi-order exports
    - Add 'hpi_multi_supplier_template' and 'generic_multi_supplier_template'
    - Add 'generic_supplier_template' for consistency
    - Maintain backward compatibility with existing records

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- Drop the existing constraint
ALTER TABLE order_export_history
  DROP CONSTRAINT IF EXISTS export_type_check;

-- Add updated constraint with support for multi-order exports
ALTER TABLE order_export_history
  ADD CONSTRAINT export_type_check CHECK (
    export_type IN (
      'hpi_supplier_template',
      'hpi_multi_supplier_template',
      'generic',
      'generic_supplier_template',
      'generic_multi_supplier_template',
      'custom'
    )
  );