
-- Reset any stuck emails back to queued status
UPDATE email_outbox
SET status = 'queued', lock_token = NULL, updated_at = NOW()
WHERE status = 'sending' AND updated_at < NOW() - INTERVAL '5 minutes';

-- Remove the check constraint on email_logs status if it exists
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_status_check;
