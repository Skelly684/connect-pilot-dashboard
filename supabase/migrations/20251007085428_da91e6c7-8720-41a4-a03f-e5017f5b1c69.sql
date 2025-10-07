-- Fix queue_email_step to not check lead existence (RLS prevents it from seeing the lead)
-- The trigger already has access to the lead, so this check is unnecessary and causes failures

CREATE OR REPLACE FUNCTION public.queue_email_step(
  p_lead_id uuid,
  p_campaign_id uuid,
  p_step_number integer,
  p_template_id uuid,
  p_to_email text,
  p_subject text,
  p_body text,
  p_send_after timestamptz DEFAULT now()
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
  RAISE NOTICE '🔵 queue_email_step called for lead=%, campaign=%, step=%, to=%', 
    p_lead_id, p_campaign_id, p_step_number, p_to_email;
  
  -- Generate deterministic idempotency key
  v_idem_key := 'email_' || p_lead_id::text || '_step_' || p_step_number::text;
  RAISE NOTICE '🔑 Using idem_key: %', v_idem_key;
  
  -- Check if email already exists (queued or sending)
  SELECT id INTO v_existing_id
  FROM email_outbox
  WHERE lead_id = p_lead_id 
    AND step_number = p_step_number
    AND status IN ('queued', 'sending')
  LIMIT 1;
  
  IF v_existing_id IS NOT NULL THEN
    RAISE NOTICE '⚠️ Email already queued for lead % step % (id: %)', p_lead_id, p_step_number, v_existing_id;
    RETURN v_existing_id;
  END IF;
  
  RAISE NOTICE '📝 No existing email found, inserting new one';
  
  -- Insert new email with error handling
  BEGIN
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
    
    RAISE NOTICE '✅ Successfully queued email for lead % step % (id: %)', p_lead_id, p_step_number, v_outbox_id;
    RETURN v_outbox_id;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ Failed to insert email: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE WARNING '❌ Details - lead_id=%, campaign_id=%, step=%, template_id=%, to_email=%', 
      p_lead_id, p_campaign_id, p_step_number, p_template_id, p_to_email;
    RETURN NULL;
  END;
END;
$$;