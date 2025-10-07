-- Fix the trigger to properly queue emails on acceptance
-- The issue: condition was too strict and blocking all email queuing

DROP TRIGGER IF EXISTS trigger_queue_first_email ON leads;

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
  
  -- CRITICAL FIX: Queue email when status is/becomes accepted
  -- But do NOT re-queue when next_email_step changes from a number to NULL (sequence complete)
  IF TG_OP = 'INSERT' THEN
    v_should_queue := (NEW.status = 'accepted' AND NEW.email_address IS NOT NULL);
    RAISE NOTICE 'INSERT: should_queue=% (status=%, email=%)', v_should_queue, NEW.status, NEW.email_address;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Queue if status just changed to accepted, OR if already accepted but next_email_step is NULL and was NULL
    -- Do NOT queue if next_email_step changed from a number to NULL (that's sequence completion)
    v_should_queue := (
      NEW.status = 'accepted' 
      AND NEW.email_address IS NOT NULL 
      AND (
        -- Status just changed to accepted
        (OLD.status IS DISTINCT FROM 'accepted')
        OR 
        -- Status was already accepted, but this is not a sequence completion update
        -- (sequence completion is when next_email_step goes from a number to NULL)
        (OLD.status = 'accepted' AND NOT (OLD.next_email_step IS NOT NULL AND NEW.next_email_step IS NULL))
      )
    );
    RAISE NOTICE 'UPDATE: should_queue=% (status=% → %, next_step=% → %, email=%)', 
      v_should_queue, OLD.status, NEW.status, OLD.next_email_step, NEW.next_email_step, NEW.email_address;
  END IF;
  
  IF v_should_queue THEN
    RAISE NOTICE '✅ Processing lead % acceptance', NEW.id;
    
    -- Check if already queued
    IF EXISTS(SELECT 1 FROM email_outbox WHERE lead_id = NEW.id AND step_number = 0 AND status IN ('queued', 'sending')) THEN
      RAISE NOTICE '⏭️ Email already queued for lead %', NEW.id;
      RETURN NEW;
    END IF;
    
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
    
    RAISE NOTICE '📋 Using campaign: %', v_campaign_id;
    
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
    
    RAISE NOTICE '📧 Using template: %', v_template_id;
    
    -- Get template content
    SELECT subject, body INTO v_subject, v_body
    FROM email_templates
    WHERE id = v_template_id;
    
    IF v_subject IS NULL OR v_body IS NULL THEN
      RAISE WARNING '❌ Template % not found or has no subject/body', v_template_id;
      RETURN NEW;
    END IF;
    
    RAISE NOTICE '📝 Template loaded: subject=%, body length=%', v_subject, length(v_body);
    
    -- Check daily cap
    SELECT COUNT(*) INTO v_emails_sent_today
    FROM email_logs
    WHERE campaign_id = v_campaign_id
      AND DATE(created_at AT TIME ZONE COALESCE(v_campaign_record.timezone, 'America/New_York')) = 
          DATE(NOW() AT TIME ZONE COALESCE(v_campaign_record.timezone, 'America/New_York'))
      AND status = 'sent';
    
    RAISE NOTICE '📊 Emails sent today: % / %', v_emails_sent_today, v_campaign_record.email_daily_cap;
    
    -- Send immediately if within cap
    IF v_emails_sent_today < v_campaign_record.email_daily_cap THEN
      v_send_after := NOW();
      RAISE NOTICE '⚡ Sending immediately';
    ELSE
      v_send_after := (DATE(NOW() AT TIME ZONE COALESCE(v_campaign_record.timezone, 'America/New_York')) + INTERVAL '1 day' + 
                      (v_campaign_record.call_window_start || ' hours')::interval) 
                      AT TIME ZONE COALESCE(v_campaign_record.timezone, 'America/New_York');
      RAISE NOTICE '⏰ Scheduling for tomorrow: %', v_send_after;
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
      ELSE
        RAISE WARNING '⚠️ queue_email_step returned NULL for lead %', NEW.id;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ Error queuing email: % %', SQLERRM, SQLSTATE;
    END;
  ELSE
    RAISE NOTICE '⏭️ Skipping - should_queue=false';
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_queue_first_email
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION queue_first_email_on_accept();