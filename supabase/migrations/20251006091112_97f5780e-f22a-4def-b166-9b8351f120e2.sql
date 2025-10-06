-- Add timezone field to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Update the queue_first_email_on_accept trigger to respect delivery rules and daily cap
CREATE OR REPLACE FUNCTION queue_first_email_on_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    RAISE NOTICE 'INSERT: status=%, email=%, should_queue=%', NEW.status, NEW.email_address, v_should_queue;
  ELSIF TG_OP = 'UPDATE' THEN
    v_should_queue := (NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' AND NEW.email_address IS NOT NULL);
    RAISE NOTICE 'UPDATE: old_status=%, new_status=%, email=%, should_queue=%', OLD.status, NEW.status, NEW.email_address, v_should_queue;
  END IF;
  
  IF v_should_queue THEN
    RAISE NOTICE '✅ Processing lead % acceptance', NEW.id;
    
    -- Get campaign with delivery rules
    SELECT c.*, c.delivery_rules INTO v_campaign_record
    FROM campaigns c
    WHERE c.id = COALESCE(NEW.campaign_id, (
      SELECT id FROM campaigns 
      WHERE user_id = NEW.user_id AND is_default = true 
      LIMIT 1
    ))
    LIMIT 1;
    
    v_campaign_id := v_campaign_record.id;
    
    RAISE NOTICE 'Campaign ID: %, delivery_rules: %', v_campaign_id, v_campaign_record.delivery_rules;
    
    IF v_campaign_id IS NULL THEN
      RAISE WARNING '❌ No campaign found for lead %, skipping email queue', NEW.id;
      RETURN NEW;
    END IF;
    
    -- Check if email is enabled in delivery rules
    IF v_campaign_record.delivery_rules IS NOT NULL AND 
       (v_campaign_record.delivery_rules->>'use_email')::boolean = false THEN
      RAISE NOTICE '⏭️ Email disabled in campaign delivery rules, skipping';
      RETURN NEW;
    END IF;
    
    -- Get first email step template
    SELECT ces.template_id INTO v_template_id
    FROM campaign_email_steps ces
    WHERE ces.campaign_id = v_campaign_id
      AND ces.step_number = 1
      AND ces.is_active = true
    LIMIT 1;
    
    RAISE NOTICE 'Template ID: %', v_template_id;
    
    IF v_template_id IS NULL THEN
      RAISE WARNING '❌ No active email step 1 found for campaign %, skipping', v_campaign_id;
      RETURN NEW;
    END IF;
    
    -- Get template content
    SELECT subject, body INTO v_subject, v_body
    FROM email_templates
    WHERE id = v_template_id;
    
    RAISE NOTICE 'Template subject: %, body length: %', v_subject, length(v_body);
    
    IF v_subject IS NULL OR v_body IS NULL THEN
      RAISE WARNING '❌ Template % not found or empty, skipping', v_template_id;
      RETURN NEW;
    END IF;
    
    -- Check daily email cap
    SELECT COUNT(*) INTO v_emails_sent_today
    FROM email_logs
    WHERE campaign_id = v_campaign_id
      AND DATE(created_at AT TIME ZONE COALESCE(v_campaign_record.timezone, 'America/New_York')) = 
          DATE(NOW() AT TIME ZONE COALESCE(v_campaign_record.timezone, 'America/New_York'))
      AND status = 'sent';
    
    RAISE NOTICE 'Emails sent today: % / %', v_emails_sent_today, v_campaign_record.email_daily_cap;
    
    -- Calculate send time based on daily cap
    IF v_emails_sent_today < v_campaign_record.email_daily_cap THEN
      -- Within daily cap, send immediately
      v_send_after := NOW();
      RAISE NOTICE '✅ Within daily cap, sending immediately';
    ELSE
      -- Exceeded daily cap, schedule for tomorrow at 9 AM in campaign timezone
      v_send_after := (DATE(NOW() AT TIME ZONE COALESCE(v_campaign_record.timezone, 'America/New_York')) + INTERVAL '1 day' + 
                      (v_campaign_record.call_window_start || ' hours')::interval) 
                      AT TIME ZONE COALESCE(v_campaign_record.timezone, 'America/New_York');
      RAISE NOTICE '⏰ Daily cap exceeded, scheduling for %', v_send_after;
    END IF;
    
    -- Queue the email
    BEGIN
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
      
      RAISE NOTICE '✅ Queued email with ID: % for send_after: %', v_queued_id, v_send_after;
      
      IF v_queued_id IS NOT NULL THEN
        -- Update lead with tracking info
        NEW.next_email_step := 1;
        NEW.next_email_at := v_send_after;
        NEW.campaign_id := v_campaign_id;
        
        RAISE NOTICE '✅ Updated lead tracking for %', NEW.id;
      ELSE
        RAISE WARNING '❌ queue_email_step returned NULL for lead %', NEW.id;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ Error queuing email: % %', SQLERRM, SQLSTATE;
    END;
    
  ELSE
    RAISE NOTICE '⏭️ Skipping email queue for lead %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_queue_first_email ON leads;
CREATE TRIGGER trigger_queue_first_email
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION queue_first_email_on_accept();