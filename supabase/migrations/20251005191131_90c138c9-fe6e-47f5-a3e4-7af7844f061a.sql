-- Make trigger work even if next_email_step is NULL (for first email)
-- This handles both old leads and new leads consistently

DROP TRIGGER IF EXISTS trg_auto_queue_initial_email ON public.leads;

CREATE OR REPLACE FUNCTION public.auto_queue_initial_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_campaign campaigns%ROWTYPE;
  v_template email_templates%ROWTYPE;
  v_email TEXT;
BEGIN
  -- Queue email when status changes to 'accepted' or 'sent_for_contact'
  -- AND it's the first email (next_email_step is NULL or 1)
  IF (NEW.status IN ('accepted', 'sent_for_contact'))
     AND (OLD.status IS NULL OR OLD.status NOT IN ('accepted', 'sent_for_contact'))
     AND NEW.campaign_id IS NOT NULL
     AND (NEW.next_email_step IS NULL OR NEW.next_email_step = 1)
  THEN
    -- Determine which email to use
    v_email := COALESCE(NEW.email, NEW.email_address);
    
    IF v_email IS NULL OR v_email = 'N/A' OR v_email = '' THEN
      RAISE NOTICE 'Skipping email queue for lead % - no valid email address', NEW.id;
      RETURN NEW;
    END IF;
    
    -- Get campaign settings
    SELECT * INTO v_campaign
    FROM campaigns
    WHERE id = NEW.campaign_id;
    
    IF v_campaign.send_first_immediately THEN
      -- Get the step 1 template
      SELECT et.* INTO v_template
      FROM campaign_email_steps ces
      JOIN email_templates et ON et.id = ces.template_id
      WHERE ces.campaign_id = NEW.campaign_id
        AND ces.step_number = 1
        AND ces.is_active = TRUE;
      
      IF v_template.id IS NOT NULL THEN
        -- Queue the email (idempotent via unique constraint)
        PERFORM queue_email_step(
          NEW.id,
          NEW.campaign_id,
          1,
          v_template.id,
          v_email,
          v_template.subject,
          v_template.body,
          NOW()
        );
        
        -- Update lead to mark first email as queued
        UPDATE leads
        SET next_email_step = 1,
            next_email_at = NOW()
        WHERE id = NEW.id;
        
        RAISE NOTICE 'Auto-queued initial email for lead %', NEW.id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_queue_initial_email
AFTER INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.auto_queue_initial_email();

-- Manually queue the email for the lead that was just accepted
-- (This will only work if it hasn't been queued yet)
DO $$
DECLARE
  v_campaign_id UUID := '07c9f84c-3f99-467e-a404-ad5a982341f4';
  v_lead_id UUID := 'a44ca480-d939-4a0a-a3fb-c70c8377f9d9';
  v_email TEXT := 'scttskelly@gmail.com';
  v_template_id UUID;
  v_subject TEXT;
  v_body TEXT;
BEGIN
  -- Get step 1 template
  SELECT et.id, et.subject, et.body 
  INTO v_template_id, v_subject, v_body
  FROM campaign_email_steps ces
  JOIN email_templates et ON et.id = ces.template_id
  WHERE ces.campaign_id = v_campaign_id
    AND ces.step_number = 1
    AND ces.is_active = TRUE;
  
  IF v_template_id IS NOT NULL THEN
    -- Queue the email
    PERFORM queue_email_step(
      v_lead_id,
      v_campaign_id,
      1,
      v_template_id,
      v_email,
      v_subject,
      v_body,
      NOW()
    );
    
    -- Update lead
    UPDATE leads
    SET next_email_step = 1,
        next_email_at = NOW(),
        email = v_email
    WHERE id = v_lead_id;
    
    RAISE NOTICE 'Manually queued email for lead %', v_lead_id;
  END IF;
END $$;