
-- Clear stuck emails from outbox that are in 'sending' status
-- These are likely from failed previous attempts
DELETE FROM email_outbox
WHERE status = 'sending'
AND id IN (
  '3d84efe5-ca01-43ea-96da-3219b8292825',
  '4c40dcde-284a-4ead-b403-58c31384fd6d',
  '191ace00-2598-4ac6-8759-c1a42fd27da0'
);
