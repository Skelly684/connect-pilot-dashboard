-- Create trigger to delete queued emails when a lead is deleted
CREATE OR REPLACE FUNCTION delete_lead_emails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete all queued/sending emails for this lead
  DELETE FROM email_outbox WHERE lead_id = OLD.id;
  RAISE NOTICE 'Deleted queued emails for lead %', OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_delete_lead_emails ON leads;
CREATE TRIGGER trigger_delete_lead_emails
  BEFORE DELETE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION delete_lead_emails();

-- Also add a cleanup for stuck emails (in 'sending' status for > 10 minutes)
-- This prevents emails from getting stuck forever if a worker crashes
CREATE OR REPLACE FUNCTION cleanup_stuck_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE email_outbox
  SET 
    status = 'queued',
    lock_token = NULL,
    attempts = attempts + 1
  WHERE status = 'sending'
    AND updated_at < NOW() - INTERVAL '10 minutes';
END;
$$;