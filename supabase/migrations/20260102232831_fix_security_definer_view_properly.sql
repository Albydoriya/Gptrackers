/*
  # Fix Security Definer View
  
  ## Overview
  Recreates the exchange_rate_job_history view with SECURITY INVOKER instead of SECURITY DEFINER.
  
  ## Changes
  - Drops existing view
  - Recreates with explicit security_invoker = true option
  - This prevents privilege escalation by running queries with the invoker's permissions
  
  ## Security Impact
  The view will now execute with the permissions of the user calling it (SECURITY INVOKER)
  rather than the permissions of the view owner (SECURITY DEFINER).
*/

-- Drop existing view
DROP VIEW IF EXISTS exchange_rate_job_history;

-- Recreate with SECURITY INVOKER explicitly set
CREATE VIEW exchange_rate_job_history 
WITH (security_invoker = true) AS
SELECT 
  runid,
  jobid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE command LIKE '%update-exchange-rate%'
ORDER BY start_time DESC
LIMIT 30;

-- Ensure proper access control
REVOKE ALL ON exchange_rate_job_history FROM PUBLIC;
GRANT SELECT ON exchange_rate_job_history TO authenticated, service_role;

COMMENT ON VIEW exchange_rate_job_history IS 
  'Shows the last 30 executions of the exchange rate update job. Uses SECURITY INVOKER for safe access control.';
