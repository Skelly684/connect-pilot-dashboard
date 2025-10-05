-- Delete all emails from outbox
DELETE FROM email_outbox;

-- Reset all leads' email tracking so they don't auto-queue more emails
UPDATE leads
SET 
  next_email_step = NULL,
  next_email_at = NULL
WHERE next_email_step IS NOT NULL OR next_email_at IS NOT NULL;