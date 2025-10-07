-- Fix duplicate first email by adding persistent guard check against email_logs
-- Problem: After mark_email_sent deletes from email_outbox, the trigger guard is gone
-- Solution: Check email_logs (which persists) in addition to email_outbox

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
  v_emails_sent_today integer;
  v_send_after timestamptz;
BEGIN
  RAISE NOTICE '=== TRIGGER FIRED (%) for lead % ===', TG_OP, NEW.id;
  
  -- Simple logic: Queue when status becomes 'accepted'
  -- For INSERT: if status is accepted
  -- For UPDATE: if status changed to accepted
  IF (TG_OP = 'INSERT' AND NEW.status = 'accepted' AND NEW.email_address IS NOT NULL)
     OR (TG_OP = 'UPDATE' AND OLD.status != 'accepted' AND NEW.status = 'accepted' AND NEW.email_address IS NOT NULL) THEN
    
    RAISE NOTICE '✅ Processing lead % acceptance', NEW.id;
    
    -- PERSISTENT GUARD: Check if step 0 already sent (in email_logs)
    IF EXISTS(SELECT 1 FROM email_logs WHERE lead_id = NEW.id AND step_number = 0 AND status = 'sent') THEN
      RAISE NOTICE '⏭️ Step 0 already sent for lead % (found in email_logs)', NEW.id;
      RETURN NEW;
    END IF;
    
    -- Check if already queued (prevent duplicates in outbox)
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
    
    -- Check if email is enabled in campaign
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
    
    -- Send immediately if within cap, otherwise schedule for tomorrow
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
    RAISE NOTICE '⏭️ Skipping - not a new acceptance (TG_OP=%, OLD.status=%, NEW.status=%)', 
      TG_OP, CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END, NEW.status;
  END IF;
  
  RETURN NEW;
END;
$function$;