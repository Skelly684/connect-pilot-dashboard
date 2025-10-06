-- Queue email for the newly accepted lead
DO $$
DECLARE
  v_queued_id uuid;
BEGIN
  v_queued_id := queue_email_step(
    'cedb7b76-37f6-4407-b6f4-3cac0c5468be'::uuid,
    'fe593741-f5b6-4912-bfa6-1f309700c2ae'::uuid,
    0,
    '552b787f-0767-4a35-91c1-b6d900b635d8'::uuid,
    'scttskelly@gmail.com',
    'aaa',
    'aa',
    NOW()
  );
  
  UPDATE leads
  SET 
    next_email_step = 0,
    next_email_at = NOW(),
    campaign_id = 'fe593741-f5b6-4912-bfa6-1f309700c2ae'
  WHERE id = 'cedb7b76-37f6-4407-b6f4-3cac0c5468be';
  
  RAISE NOTICE 'Queued email for newly accepted lead: %', v_queued_id;
END $$;