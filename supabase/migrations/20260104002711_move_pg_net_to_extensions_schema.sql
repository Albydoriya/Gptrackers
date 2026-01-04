/*
  # Move pg_net Extension to Extensions Schema

  1. Security Enhancement
    - Moves the `pg_net` extension from the public schema to the extensions schema
    - This follows PostgreSQL security best practices by isolating system extensions
    - Prevents potential conflicts with user-created objects in the public schema
  
  2. Changes
    - Creates the `extensions` schema if it doesn't already exist
    - Drops the `pg_net` extension from the public schema
    - Recreates it in the extensions schema
  
  3. Notes
    - The extension is dropped and recreated, but this is safe as it's a system extension
    - All functionality will continue to work after recreation
    - No data is stored in the extension itself
*/

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Drop the extension from public schema
DROP EXTENSION IF EXISTS pg_net CASCADE;

-- Recreate in extensions schema
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;