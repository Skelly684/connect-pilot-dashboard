
-- Delete the orphaned email (lead doesn't exist)
DELETE FROM email_outbox
WHERE id = 'c1d481f9-39ae-46d4-84ed-8448e5ac2fec';

-- Now queue the correct email for the actual accepted lead
SELECT queue_email_step(
  p_lead_id := '4bf7d875-e358-4954-b96c-216507f9ea02',
  p_campaign_id := 'fe593741-f5b6-4912-bfa6-1f309700c2ae',
  p_step_number := 1,
  p_template_id := '552b787f-0767-4a35-91c1-b6d900b635d8',
  p_to_email := 'scttskelly@gmail.com',
  p_subject := 'aaa',
  p_body := (SELECT body FROM email_templates WHERE id = '552b787f-0767-4a35-91c1-b6d900b635d8'),
  p_send_after := NOW()
);
