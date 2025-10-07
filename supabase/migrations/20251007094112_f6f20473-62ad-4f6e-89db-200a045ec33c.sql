-- Fix duplicate first email issue by improving cleanup logic
-- The problem: cleanup_stuck_emails was resetting successfully sent emails back to 'queued'
-- before mark_email_sent could delete them, causing them to be sent twice

CREATE OR REPLACE FUNCTION public.cleanup_stuck_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- First, delete emails that are stuck in 'sending' but were actually sent
  -- (they exist in email_logs as 'sent')
  DELETE FROM email_outbox
  WHERE status = 'sending'
    AND updated_at < NOW() - INTERVAL '2 minutes'
    AND EXISTS (
      SELECT 1 FROM email_logs
      WHERE email_logs.lead_id = email_outbox.lead_id
        AND email_logs.step_number = email_outbox.step_number
        AND email_logs.status = 'sent'
    );
  
  -- Then reset genuinely stuck emails that were NOT successfully sent
  UPDATE email_outbox
  SET 
    status = 'queued',
    lock_token = NULL,
    attempts = attempts + 1,
    last_error = 'Timeout - reset from sending state',
    updated_at = NOW()
  WHERE status = 'sending'
    AND updated_at < NOW() - INTERVAL '2 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM email_logs
      WHERE email_logs.lead_id = email_outbox.lead_id
        AND email_logs.step_number = email_outbox.step_number
        AND email_logs.status = 'sent'
    );
    
  RAISE NOTICE 'Cleaned up stuck emails';
END;
$$;