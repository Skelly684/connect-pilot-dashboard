-- Stop all email sequences for leads that are causing spam
UPDATE leads 
SET email_sequence_stopped = true,
    last_email_status = 'failed',
    next_email_at = NULL,
    next_email_step = NULL
WHERE status = 'sent_for_contact' AND email_sequence_stopped = false;

-- Also stop sequences for any leads that have had failed emails
UPDATE leads 
SET email_sequence_stopped = true,
    next_email_at = NULL, 
    next_email_step = NULL
WHERE id IN (
    SELECT DISTINCT lead_id 
    FROM email_logs 
    WHERE status = 'failed' 
    AND created_at > now() - INTERVAL '24 hours'
);