-- Add email_sequence_stopped column if it doesn't exist (it should already exist based on schema)
-- This is just to ensure the column exists and has proper indexing

-- Add index for better performance when querying stopped sequences
CREATE INDEX IF NOT EXISTS idx_leads_email_sequence_stopped 
ON public.leads (email_sequence_stopped, next_email_at) 
WHERE email_sequence_stopped = false AND next_email_at IS NOT NULL;

-- Add index for better performance when querying leads for email processing
CREATE INDEX IF NOT EXISTS idx_leads_next_email_processing 
ON public.leads (user_id, email_sequence_stopped, next_email_at) 
WHERE email_sequence_stopped = false AND next_email_at IS NOT NULL;