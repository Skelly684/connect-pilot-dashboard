-- Fix 1: Clean up orphaned emails (from deleted leads)
DELETE FROM email_outbox
WHERE lead_id NOT IN (SELECT id FROM leads);

-- Fix 2: Activate all email templates so they can be used
UPDATE email_templates
SET is_active = true
WHERE is_active = false;

-- Fix 3: Improve queue_email_step to handle edge cases better
CREATE OR REPLACE FUNCTION queue_email_step(
  p_lead_id uuid,
  p_campaign_id uuid,
  p_step_number integer,
  p_template_id uuid,
  p_to_email text,
  p_subject text,
  p_body text,
  p_send_after timestamp with time zone DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_outbox_id UUID;
  v_idem_key TEXT;
  v_existing_id UUID;
BEGIN
  -- Generate deterministic idempotency key
  v_idem_key := 'email_' || p_lead_id::text || '_step_' || p_step_number::text;
  
  -- Check if email already exists (queued or sending)
  SELECT id INTO v_existing_id
  FROM email_outbox
  WHERE lead_id = p_lead_id 
    AND step_number = p_step_number
    AND status IN ('queued', 'sending')
  LIMIT 1;
  
  IF v_existing_id IS NOT NULL THEN
    RAISE NOTICE 'Email already queued for lead % step % (id: %)', p_lead_id, p_step_number, v_existing_id;
    RETURN v_existing_id;
  END IF;
  
  -- Insert new email
  INSERT INTO email_outbox (
    lead_id,
    campaign_id,
    step_number,
    template_id,
    to_email,
    subject,
    body,
    send_after,
    idem_key,
    status,
    provider
  ) VALUES (
    p_lead_id,
    p_campaign_id,
    p_step_number,
    p_template_id,
    p_to_email,
    p_subject,
    p_body,
    p_send_after,
    v_idem_key,
    'queued',
    'gmail_api'
  )
  RETURNING id INTO v_outbox_id;
  
  RAISE NOTICE 'Queued new email for lead % step % (id: %)', p_lead_id, p_step_number, v_outbox_id;
  RETURN v_outbox_id;
END;
$$;

-- Fix 4: Update the trigger to be more robust
CREATE OR REPLACE FUNCTION queue_first_email_on_accept()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign_id uuid;
  v_template_id uuid;
  v_subject text;
  v_body text;
  v_send_offset_minutes integer;
  v_send_after timestamptz;
  v_send_immediately boolean;
  v_queued_id uuid;
BEGIN
  -- Only proceed if status changed to 'accepted' and we have email_address
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' AND NEW.email_address IS NOT NULL THEN
    
    RAISE NOTICE 'Processing lead % acceptance', NEW.id;
    
    -- Get campaign details
    v_campaign_id := COALESCE(NEW.campaign_id, (SELECT id FROM campaigns WHERE user_id = NEW.user_id AND is_default = true LIMIT 1));
    
    IF v_campaign_id IS NULL THEN
      RAISE WARNING 'No campaign found for lead %, skipping email queue', NEW.id;
      RETURN NEW;
    END IF;
    
    -- Get first email step details
    SELECT 
      ces.template_id,
      ces.send_offset_minutes,
      c.send_first_immediately
    INTO 
      v_template_id,
      v_send_offset_minutes,
      v_send_immediately
    FROM campaign_email_steps ces
    JOIN campaigns c ON c.id = ces.campaign_id
    WHERE ces.campaign_id = v_campaign_id
      AND ces.step_number = 1
      AND ces.is_active = true
    LIMIT 1;
    
    IF v_template_id IS NULL THEN
      RAISE WARNING 'No active email step 1 found for campaign %, skipping email queue', v_campaign_id;
      RETURN NEW;
    END IF;
    
    -- Get template content (don't filter by is_active to ensure we get it)
    SELECT subject, body INTO v_subject, v_body
    FROM email_templates
    WHERE id = v_template_id;
    
    IF v_subject IS NULL OR v_body IS NULL THEN
      RAISE WARNING 'Email template % not found or empty, skipping email queue', v_template_id;
      RETURN NEW;
    END IF;
    
    -- Calculate send time
    IF v_send_immediately THEN
      v_send_after := NOW();
    ELSE
      v_send_after := NOW() + (COALESCE(v_send_offset_minutes, 0) || ' minutes')::interval;
    END IF;
    
    -- Queue the email
    v_queued_id := queue_email_step(
      p_lead_id := NEW.id,
      p_campaign_id := v_campaign_id,
      p_step_number := 1,
      p_template_id := v_template_id,
      p_to_email := NEW.email_address,
      p_subject := v_subject,
      p_body := v_body,
      p_send_after := v_send_after
    );
    
    IF v_queued_id IS NOT NULL THEN
      -- Update lead with next email tracking
      NEW.next_email_step := 1;
      NEW.next_email_at := v_send_after;
      NEW.campaign_id := v_campaign_id;
      
      RAISE NOTICE 'Successfully queued first email for lead % (outbox id: %)', NEW.id, v_queued_id;
    ELSE
      RAISE WARNING 'Failed to queue email for lead %', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;