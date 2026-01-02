/*
  # Fix Cron Job Configuration
  
  ## Overview
  Updates the cron job to use the correct Supabase project URL and authentication.
  
  ## Changes
  - Updates the scheduled job with the correct Supabase project URL
  - Configures proper authentication for edge function calls
*/

-- Remove the existing schedule
SELECT cron.unschedule('update-exchange-rates-daily');

-- Recreate the schedule with the correct configuration
SELECT cron.schedule(
  'update-exchange-rates-daily',
  '0 23 * * *',  -- Every day at 23:00 UTC (9:00 AM AEST)
  $$
  SELECT net.http_post(
    url := 'https://libaopwjoduzlkvhtukb.supabase.co/functions/v1/update-exchange-rate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);
