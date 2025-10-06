-- Reset any remaining stuck emails
UPDATE email_outbox 
SET 
  status = 'queued',
  lock_token = NULL,
  attempts = attempts + 1,
  last_error = 'Manual reset - previously stuck',
  updated_at = NOW()
WHERE status = 'sending';