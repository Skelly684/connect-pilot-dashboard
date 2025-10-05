-- Create function to queue first email when lead is accepted
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
BEGIN
  -- Only proceed if status changed to 'accepted' and we have email_address
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' AND NEW.email_address IS NOT NULL THEN
    
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
    
    -- Get template content
    SELECT subject, body INTO v_subject, v_body
    FROM email_templates
    WHERE id = v_template_id;
    
    IF v_subject IS NULL OR v_body IS NULL THEN
      RAISE WARNING 'Email template % not found, skipping email queue', v_template_id;
      RETURN NEW;
    END IF;
    
    -- Calculate send time
    IF v_send_immediately THEN
      v_send_after := NOW();
    ELSE
      v_send_after := NOW() + (COALESCE(v_send_offset_minutes, 0) || ' minutes')::interval;
    END IF;
    
    -- Queue the email
    PERFORM queue_email_step(
      p_lead_id := NEW.id,
      p_campaign_id := v_campaign_id,
      p_step_number := 1,
      p_template_id := v_template_id,
      p_to_email := NEW.email_address,
      p_subject := v_subject,
      p_body := v_body,
      p_send_after := v_send_after
    );
    
    -- Update lead with next email tracking
    NEW.next_email_step := 1;
    NEW.next_email_at := v_send_after;
    NEW.campaign_id := v_campaign_id;
    
    RAISE NOTICE 'Queued first email for lead % to be sent at %', NEW.id, v_send_after;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to queue email on accept
DROP TRIGGER IF EXISTS trigger_queue_first_email_on_accept ON leads;
CREATE TRIGGER trigger_queue_first_email_on_accept
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION queue_first_email_on_accept();