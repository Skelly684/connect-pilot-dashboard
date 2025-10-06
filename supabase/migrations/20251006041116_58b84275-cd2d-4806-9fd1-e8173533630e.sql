
-- Fix mark_email_sent to not reference non-existent updated_at column
CREATE OR REPLACE FUNCTION public.mark_email_sent(
  p_outbox_id uuid, 
  p_lock_token uuid, 
  p_provider_message_id text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_outbox_row email_outbox%ROWTYPE;
  v_log_idem_key TEXT;
  v_user_id UUID;
  v_next_step INTEGER;
  v_next_template_id UUID;
  v_next_subject TEXT;
  v_next_body TEXT;
  v_next_offset_minutes INTEGER;
  v_next_send_after TIMESTAMPTZ;
BEGIN
  -- Get and validate the outbox entry
  SELECT * INTO v_outbox_row
  FROM email_outbox
  WHERE id = p_outbox_id
    AND lock_token = p_lock_token
    AND status = 'sending'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE WARNING 'Email % not found or lock mismatch', p_outbox_id;
    RETURN FALSE;
  END IF;
  
  -- Get user_id from the lead
  SELECT user_id INTO v_user_id
  FROM leads
  WHERE id = v_outbox_row.lead_id;
  
  IF v_user_id IS NULL THEN
    RAISE WARNING 'No user_id found for lead %', v_outbox_row.lead_id;
    DELETE FROM email_outbox WHERE id = p_outbox_id;
    RETURN FALSE;
  END IF;
  
  -- Generate idempotency key for log
  v_log_idem_key := 'sent_' || v_outbox_row.lead_id::text || '_step_' || COALESCE(v_outbox_row.step_number::text, 'x');
  
  -- Insert into email_logs (idempotent)
  INSERT INTO email_logs (
    lead_id,
    campaign_id,
    step_number,
    template_id,
    to_email,
    subject,
    body,
    status,
    idem_key,
    provider,
    user_id,
    direction,
    created_at
  )
  VALUES (
    v_outbox_row.lead_id,
    v_outbox_row.campaign_id,
    v_outbox_row.step_number,
    v_outbox_row.template_id,
    v_outbox_row.to_email,
    v_outbox_row.subject,
    v_outbox_row.body,
    'sent',
    v_log_idem_key,
    v_outbox_row.provider,
    v_user_id,
    'outbound',
    NOW()
  )
  ON CONFLICT (idem_key) DO NOTHING;
  
  -- Delete from outbox (it's been logged)
  DELETE FROM email_outbox WHERE id = p_outbox_id;
  
  -- Now schedule the next email step
  v_next_step := v_outbox_row.step_number + 1;
  
  -- Get the next step details
  SELECT 
    ces.template_id,
    ces.send_offset_minutes,
    et.subject,
    et.body
  INTO 
    v_next_template_id,
    v_next_offset_minutes,
    v_next_subject,
    v_next_body
  FROM campaign_email_steps ces
  JOIN email_templates et ON et.id = ces.template_id
  WHERE ces.campaign_id = v_outbox_row.campaign_id
    AND ces.step_number = v_next_step
    AND ces.is_active = TRUE
  LIMIT 1;
  
  IF v_next_template_id IS NOT NULL THEN
    -- Calculate when to send the next email (offset from NOW)
    v_next_send_after := NOW() + (COALESCE(v_next_offset_minutes, 0) || ' minutes')::interval;
    
    -- Queue the next email
    PERFORM queue_email_step(
      p_lead_id := v_outbox_row.lead_id,
      p_campaign_id := v_outbox_row.campaign_id,
      p_step_number := v_next_step,
      p_template_id := v_next_template_id,
      p_to_email := v_outbox_row.to_email,
      p_subject := v_next_subject,
      p_body := v_next_body,
      p_send_after := v_next_send_after
    );
    
    -- Update lead tracking
    UPDATE leads
    SET 
      next_email_step = v_next_step,
      next_email_at = v_next_send_after
    WHERE id = v_outbox_row.lead_id;
    
    RAISE NOTICE 'Queued next email step % for lead % to send at %', v_next_step, v_outbox_row.lead_id, v_next_send_after;
  ELSE
    -- No more steps, mark sequence as complete
    UPDATE leads
    SET 
      next_email_step = NULL,
      next_email_at = NULL
    WHERE id = v_outbox_row.lead_id;
    
    RAISE NOTICE 'Email sequence complete for lead %', v_outbox_row.lead_id;
  END IF;
  
  RAISE NOTICE 'Marked email % as sent', p_outbox_id;
  RETURN TRUE;
END;
$function$;

-- Also clear the stuck email and re-queue step 1
DELETE FROM email_outbox WHERE id = '58f4f946-055b-4069-a77c-ef8937dcd237';

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
