-- Stop spamming email and call requests by marking them as stopped

-- Update email logs with specific idem_keys to failed status to stop processing
UPDATE email_logs 
SET status = 'failed', 
    error = 'Manually stopped to prevent spam requests'
WHERE idem_key IN (
  '7aeb7659-dc0b-4202-98d5-0f5443018548:96a3fc80-f296-46ee-b5a7-63fbc1c762b6',
  '7aeb7659-dc0b-4202-98d5-0f5443018548:b461f89c-6dcf-4784-b1e6-48ca3b86b65f',
  'a6d5ba6a-89d1-49d1-96ad-18e200a6e7c9:2316ea63-cbf9-4d25-ae48-fda0b216b6a1',
  'a6d5ba6a-89d1-49d1-96ad-18e200a6e7c9:7cf1c8ee-8dfe-4a38-9033-4cbdba32e3af'
);

-- Update call logs for the associated leads to failed status
UPDATE call_logs 
SET call_status = 'failed',
    notes = 'Manually cancelled to stop spam requests'
WHERE lead_id IN (
  '7aeb7659-dc0b-4202-98d5-0f5443018548',
  'a6d5ba6a-89d1-49d1-96ad-18e200a6e7c9'
) AND call_status = 'queued';

-- Also update the leads to rejected status to stop further processing
UPDATE leads 
SET status = 'rejected',
    notes = COALESCE(notes, '') || ' - Processing cancelled to stop spam requests',
    email_sequence_stopped = true,
    updated_at = now()
WHERE id IN (
  '7aeb7659-dc0b-4202-98d5-0f5443018548',
  'a6d5ba6a-89d1-49d1-96ad-18e200a6e7c9'
);