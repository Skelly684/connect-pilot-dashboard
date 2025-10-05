-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant permissions to supabase_admin
GRANT USAGE ON SCHEMA cron TO supabase_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO supabase_admin;

-- Remove old email worker cron job if it exists (check first)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'email-worker-every-2-minutes'
  ) THEN
    PERFORM cron.unschedule('email-worker-every-2-minutes');
  END IF;
END $$;

-- Schedule email worker to run every 2 minutes
SELECT cron.schedule(
  'email-worker-every-2-minutes',
  '*/2 * * * *', -- Every 2 minutes
  $$
  SELECT net.http_post(
    url := 'https://zcgutkfkohonpqvwfukk.supabase.co/functions/v1/email-worker',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjZ3V0a2Zrb2hvbnBxdndmdWtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjQ1NDQsImV4cCI6MjA2Njg0MDU0NH0.o-TqrNAurwz7JLJlKXsiK-4ELyhhlYb1BhCh-Ix9ZWs"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  ) AS request_id;
  $$
);