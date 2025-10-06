-- Revert to simpler approach: just fix the initial email queue

-- Fix queue_first_email_on_accept to use initial_template_id for step 0
CREATE OR REPLACE FUNCTION public.queue_first_email_on_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_campaign_id uuid;
  v_campaign_record RECORD;
  v_template_id uuid;
  v_subject text;
  v_body text;
  v_queued_id uuid;
  v_should_queue boolean := false;
  v_emails_sent_today integer;
  v_send_after timestamptz;
BEGIN
  RAISE NOTICE '=== TRIGGER FIRED (%) for lead % ===', TG_OP, NEW.id;
  
  -- Determine if we should queue email
  IF TG_OP = 'INSERT' THEN
    v_should_queue := (NEW.status = 'accepted' AND NEW.email_address IS NOT NULL);
  ELSIF TG_OP = 'UPDATE' THEN
    v_should_queue := (NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' AND NEW.email_address IS NOT NULL);
  END IF;
  
  IF v_should_queue THEN
    RAISE NOTICE '✅ Processing lead % acceptance', NEW.id;
    
    -- Get campaign
    SELECT c.* INTO v_campaign_record
    FROM campaigns c
    WHERE c.id = COALESCE(NEW.campaign_id, (
      SELECT id FROM campaigns 
      WHERE user_id = NEW.user_id AND is_default = true 
      LIMIT 1
    ))
    LIMIT 1;
    
    v_campaign_id := v_campaign_record.id;
    
    IF v_campaign_id IS NULL THEN
      RAISE WARNING '❌ No campaign found for lead %', NEW.id;
      RETURN NEW;
    END IF;
    
    -- Check if email is enabled
    IF v_campaign_record.delivery_rules IS NOT NULL AND 
       (v_campaign_record.delivery_rules->>'use_email')::boolean = false THEN
      RAISE NOTICE '⏭️ Email disabled in campaign delivery rules';
      RETURN NEW;
    END IF;
    
    -- Use initial_template_id for first email
    v_template_id := v_campaign_record.initial_template_id;
    
    IF v_template_id IS NULL THEN
      RAISE WARNING '❌ No initial_template_id found for campaign %', v_campaign_id;
      RETURN NEW;
    END IF;
    
    -- Get template content
    SELECT subject, body INTO v_subject, v_body
    FROM email_templates
    WHERE id = v_template_id;
    
    IF v_subject IS NULL OR v_body IS NULL THEN
      RAISE WARNING '❌ Template % not found', v_template_id;
      RETURN NEW;
    END IF;
    
    -- Check daily cap
    SELECT COUNT(*) INTO v_emails_sent_today
    FROM email_logs
    WHERE campaign_id = v_campaign_id
      AND DATE(created_at AT TIME ZONE COALESCE(v_campaign_record.timezone, 'America/New_York')) = 
          DATE(NOW() AT TIME ZONE COALESCE(v_campaign_record.timezone, 'America/New_York'))
      AND status = 'sent';
    
    -- Send immediately if within cap
    IF v_emails_sent_today < v_campaign_record.email_daily_cap THEN
      v_send_after := NOW();
    ELSE
      v_send_after := (DATE(NOW() AT TIME ZONE COALESCE(v_campaign_record.timezone, 'America/New_York')) + INTERVAL '1 day' + 
                      (v_campaign_record.call_window_start || ' hours')::interval) 
                      AT TIME ZONE COALESCE(v_campaign_record.timezone, 'America/New_York');
    END IF;
    
    -- Queue initial email as step 0
    BEGIN
      v_queued_id := queue_email_step(
        p_lead_id := NEW.id,
        p_campaign_id := v_campaign_id,
        p_step_number := 0,
        p_template_id := v_template_id,
        p_to_email := NEW.email_address,
        p_subject := v_subject,
        p_body := v_body,
        p_send_after := v_send_after
      );
      
      IF v_queued_id IS NOT NULL THEN
        NEW.next_email_step := 0;
        NEW.next_email_at := v_send_after;
        NEW.campaign_id := v_campaign_id;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ Error queuing email: % %', SQLERRM, SQLSTATE;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Simplify mark_email_sent to just queue next step
CREATE OR REPLACE FUNCTION public.mark_email_sent(p_outbox_id uuid, p_lock_token uuid, p_provider_message_id text DEFAULT NULL)
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
  
  -- Get next step from campaign_email_steps
  SELECT ces.template_id, ces.send_offset_minutes, et.subject, et.body
  INTO v_next_template_id, v_next_offset_minutes, v_next_subject, v_next_body
  FROM campaign_email_steps ces
  JOIN email_templates et ON et.id = ces.template_id
  WHERE ces.campaign_id = v_outbox_row.campaign_id
    AND ces.step_number = v_next_step
    AND ces.is_active = TRUE
  LIMIT 1;
  
  IF v_next_template_id IS NOT NULL THEN
    -- Calculate send time using offset
    v_next_send_after := NOW() + (COALESCE(v_next_offset_minutes, 0) || ' minutes')::interval;
    
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