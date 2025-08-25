-- Add richer columns for external call provider integration (safe to run multiple times)
ALTER TABLE public.call_logs
  ADD COLUMN IF NOT EXISTS external_call_id text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_call_id text,
  ADD COLUMN IF NOT EXISTS attempt_number int,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_seconds int,
  ADD COLUMN IF NOT EXISTS recording_url text;

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_call_logs_external_call_id ON public.call_logs(external_call_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_lead_id_created_at ON public.call_logs(lead_id, created_at DESC);