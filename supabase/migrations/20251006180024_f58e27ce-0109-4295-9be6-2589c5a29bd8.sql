
-- Ensure the trigger function exists and is correct
CREATE OR REPLACE FUNCTION public.queue_first_email_on_accept()
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
        RAISE NOTICE '✅ Successfully queued email % for lead %', v_queued_id, NEW.id;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ Error queuing email: % %', SQLERRM, SQLSTATE;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS trigger_queue_first_email ON leads;

CREATE TRIGGER trigger_queue_first_email
  BEFORE INSERT OR UPDATE OF status, email_address, campaign_id
  ON leads
  FOR EACH ROW
  EXECUTE FUNCTION queue_first_email_on_accept();

-- Verify the trigger was created
DO $$
DECLARE
  v_trigger_count integer;
BEGIN
  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'trigger_queue_first_email'
    AND event_object_table = 'leads';
    
  IF v_trigger_count = 0 THEN
    RAISE EXCEPTION 'Trigger was not created successfully!';
  ELSE
    RAISE NOTICE '✅ Trigger created successfully';
  END IF;
END $$;
