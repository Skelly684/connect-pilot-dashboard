-- Add missing unique constraint for duplicate prevention
CREATE UNIQUE INDEX IF NOT EXISTS email_outbox_lead_step_unique 
ON email_outbox (lead_id, step_number) 
WHERE status IN ('queued', 'processing');

COMMENT ON INDEX email_outbox_lead_step_unique IS 'Prevents duplicate emails for same lead+step while queued or processing';