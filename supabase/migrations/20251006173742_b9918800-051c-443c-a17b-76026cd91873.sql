-- Manually queue email for the accepted lead
DO $$
DECLARE
  v_queued_id uuid;
BEGIN
  -- Queue the initial email
  v_queued_id := queue_email_step(
    'e0424f0c-500f-4e5b-b28a-bdbcfce5a609'::uuid,
    'e793322c-d61e-4aa2-a24e-f45d91932691'::uuid,
    0,
    '330b492d-9078-45d1-aa84-8f55677bf455'::uuid,
    'scttskelly@gmail.com',
    'test 0',
    'test 0',
    NOW()
  );
  
  -- Update the lead
  UPDATE leads
  SET 
    next_email_step = 0,
    next_email_at = NOW(),
    campaign_id = 'e793322c-d61e-4aa2-a24e-f45d91932691'
  WHERE id = 'e0424f0c-500f-4e5b-b28a-bdbcfce5a609';
  
  RAISE NOTICE 'Queued email: %', v_queued_id;
END $$;