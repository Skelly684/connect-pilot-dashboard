-- email_logs: add missing columns
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'gmail';

-- leads: add email tracking columns
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS emailed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_email_status text;

-- Create indexes for email_logs
CREATE INDEX IF NOT EXISTS idx_email_logs_lead_id ON public.email_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at DESC);

-- Refresh the PostgREST schema cache (prevents the PGRST204 errors)
SELECT pg_notify('pgrst', 'reload schema');