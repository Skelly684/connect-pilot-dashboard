-- Update mark_email_sent function to support exact date/time scheduling
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
  v_next_send_at TIMESTAMPTZ;
  v_next_send_after TIMESTAMPTZ;
BEGIN
  -- Get outbox entry
  SELECT * INTO v_outbox_row
  FROM email_outbox
  WHERE id = p_outbox_id
    AND lock_token = p_lock_token
    AND status = 'sending'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Get user_id
  SELECT user_id INTO v_user_id
  FROM leads
  WHERE id = v_outbox_row.lead_id;
  
  IF v_user_id IS NULL THEN
    DELETE FROM email_outbox WHERE id = p_outbox_id;
    RETURN FALSE;
  END IF;
  
  -- Log the sent email
  v_log_idem_key := 'sent_' || v_outbox_row.lead_id::text || '_step_' || COALESCE(v_outbox_row.step_number::text, 'x');
  
  INSERT INTO email_logs (
    lead_id, campaign_id, step_number, template_id, to_email, subject, body,
    status, idem_key, provider, user_id, direction, created_at
  )
  VALUES (
    v_outbox_row.lead_id, v_outbox_row.campaign_id, v_outbox_row.step_number,
    v_outbox_row.template_id, v_outbox_row.to_email, v_outbox_row.subject,
    v_outbox_row.body, 'sent', v_log_idem_key, v_outbox_row.provider,
    v_user_id, 'outbound', NOW()
  )
  ON CONFLICT (idem_key) DO NOTHING;
  
  DELETE FROM email_outbox WHERE id = p_outbox_id;
  
  -- Determine next step
  v_next_step := v_outbox_row.step_number + 1;
  
  -- Get next step from campaign_email_steps, including send_at
  SELECT ces.template_id, ces.send_offset_minutes, ces.send_at, et.subject, et.body
  INTO v_next_template_id, v_next_offset_minutes, v_next_send_at, v_next_subject, v_next_body
  FROM campaign_email_steps ces
  JOIN email_templates et ON et.id = ces.template_id
  WHERE ces.campaign_id = v_outbox_row.campaign_id
    AND ces.step_number = v_next_step
    AND ces.is_active = TRUE
  LIMIT 1;
  
  IF v_next_template_id IS NOT NULL THEN
    -- Use send_at if specified (exact date/time), otherwise calculate from offset (relative delay)
    IF v_next_send_at IS NOT NULL THEN
      v_next_send_after := v_next_send_at;
      RAISE NOTICE 'Using exact send_at time: %', v_next_send_at;
    ELSE
      v_next_send_after := NOW() + (COALESCE(v_next_offset_minutes, 0) || ' minutes')::interval;
      RAISE NOTICE 'Using offset calculation: % minutes from now', v_next_offset_minutes;
    END IF;
    
    -- Queue next email
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
    
    UPDATE leads
    SET next_email_step = v_next_step, next_email_at = v_next_send_after
    WHERE id = v_outbox_row.lead_id;
  ELSE
    -- No more steps
    UPDATE leads
    SET next_email_step = NULL, next_email_at = NULL
    WHERE id = v_outbox_row.lead_id;
  END IF;
  
  RETURN TRUE;
END;
$function$;