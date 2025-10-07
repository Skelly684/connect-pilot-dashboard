-- Clean up the duplicate queued email and reset the lead state
DELETE FROM email_outbox WHERE id = '8a8145c4-91d9-4d18-9267-39ce72179fa1';

UPDATE leads 
SET next_email_step = NULL, next_email_at = NULL 
WHERE id = '456c03f2-b462-4838-8bf8-5960b27af547';