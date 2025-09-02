-- Stop spamming email and call requests by marking them as cancelled

-- Update email logs with specific idem_keys to cancelled status
UPDATE email_logs 
SET status = 'cancelled', 
    error = 'Manually cancelled to stop spam requests',
    updated_at = now()
WHERE idem_key IN (
  '7aeb7659-dc0b-4202-98d5-0f5443018548:96a3fc80-f296-46ee-b5a7-63fbc1c762b6',
  '7aeb7659-dc0b-4202-98d5-0f5443018548:b461f89c-6dcf-4784-b1e6-48ca3b86b65f',
  'a6d5ba6a-89d1-49d1-96ad-18e200a6e7c9:2316ea63-cbf9-4d25-ae48-fda0b216b6a1',
  'a6d5ba6a-89d1-49d1-96ad-18e200a6e7c9:7cf1c8ee-8dfe-4a38-9033-4cbdba32e3af'
);

-- Update call logs for the associated leads to cancelled status
UPDATE call_logs 
SET call_status = 'cancelled',
    notes = 'Manually cancelled to stop spam requests'
WHERE lead_id IN (
  '7aeb7659-dc0b-4202-98d5-0f5443018548',
  'a6d5ba6a-89d1-49d1-96ad-18e200a6e7c9'
) AND call_status = 'queued';

-- Also update the leads to stop further processing
UPDATE leads 
SET status = 'cancelled',
    notes = COALESCE(notes, '') || ' - Processing cancelled to stop spam requests',
    email_sequence_stopped = true
WHERE id IN (
  '7aeb7659-dc0b-4202-98d5-0f5443018548',
  'a6d5ba6a-89d1-49d1-96ad-18e200a6e7c9'
);