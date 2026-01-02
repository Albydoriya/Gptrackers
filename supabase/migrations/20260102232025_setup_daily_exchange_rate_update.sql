/*
  # Setup Daily Exchange Rate Updates
  
  ## Overview
  This migration configures automatic daily exchange rate updates to run at 9:00 AM AEST (Australian Eastern Standard Time).
  
  ## Changes
  
  1. **Extensions**
     - Enable `pg_cron` - PostgreSQL job scheduler for running scheduled tasks
     - Enable `pg_net` - HTTP client for making requests from PostgreSQL
  
  2. **Scheduled Job**
     - Job Name: `update-exchange-rates-daily`
     - Schedule: Every day at 23:00 UTC (9:00 AM AEST)
     - Action: Calls the `update-exchange-rate` edge function
     - Authentication: Uses service role key for authorized access
  
  ## Important Notes
  
  - **Time Zone**: Set to 23:00 UTC which equals 9:00 AM AEST
    - During daylight saving (AEDT), this becomes 10:00 AM AEDT
    - Runs before Australian market opens for fresh rates
  
  - **Automatic Execution**: The edge function will run automatically every day
  
  - **Monitoring**: Check `cron.job_run_details` table to view execution history
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant permissions to use pg_net
GRANT USAGE ON SCHEMA net TO postgres, authenticated, service_role;

-- Remove any existing schedule with the same name
SELECT cron.unschedule('update-exchange-rates-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'update-exchange-rates-daily'
);

-- Schedule daily exchange rate update at 9:00 AM AEST (23:00 UTC)
SELECT cron.schedule(
  'update-exchange-rates-daily',
  '0 23 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.api_url') || '/functions/v1/update-exchange-rate',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);

-- Store Supabase configuration for the cron job
DO $$
BEGIN
  -- Set the API URL configuration
  EXECUTE format('ALTER DATABASE %I SET app.settings.api_url TO %L', 
    current_database(), 
    current_setting('SUPABASE_URL', true)
  );
  
  -- Set the service role key configuration
  EXECUTE format('ALTER DATABASE %I SET app.settings.service_role_key TO %L', 
    current_database(), 
    current_setting('SUPABASE_SERVICE_ROLE_KEY', true)
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If settings cannot be set automatically, they need to be configured manually
    RAISE NOTICE 'Could not set database settings automatically. Configure manually if needed.';
END $$;

-- Create a helper view to monitor cron job execution
CREATE OR REPLACE VIEW exchange_rate_job_history AS
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

-- Grant access to view job history
GRANT SELECT ON exchange_rate_job_history TO authenticated, service_role;

-- Add helpful comment
COMMENT ON VIEW exchange_rate_job_history IS 'Shows the last 30 executions of the exchange rate update job for monitoring purposes';
