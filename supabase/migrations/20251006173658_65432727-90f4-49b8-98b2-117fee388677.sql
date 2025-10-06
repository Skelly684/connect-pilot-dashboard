-- Trigger email queue for the recently accepted lead
UPDATE leads
SET 
  campaign_id = 'e793322c-d61e-4aa2-a24e-f45d91932691',
  updated_at = NOW()
WHERE id = 'e0424f0c-500f-4e5b-b28a-bdbcfce5a609';

-- Verify email was queued
SELECT 
  'Email queued' as status,
  eo.id,
  eo.to_email,
  eo.subject,
  eo.status,
  eo.send_after
FROM email_outbox eo
WHERE eo.lead_id = 'e0424f0c-500f-4e5b-b28a-bdbcfce5a609';