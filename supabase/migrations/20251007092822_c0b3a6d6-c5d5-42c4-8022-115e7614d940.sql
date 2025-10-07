-- Add unique constraint on email_outbox.idem_key to prevent duplicate emails
-- This ensures that even with race conditions, the same email can't be queued twice

-- First, clean up any existing duplicates in email_outbox
DELETE FROM email_outbox a
USING email_outbox b
WHERE a.id > b.id 
  AND a.idem_key = b.idem_key;

-- Add unique constraint on idem_key
ALTER TABLE email_outbox
ADD CONSTRAINT email_outbox_idem_key_unique UNIQUE (idem_key);

-- Update queue_email_step to handle conflicts gracefully
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
BEGIN
  RAISE NOTICE '🔵 queue_email_step called for lead=%, campaign=%, step=%, to=%', 
    p_lead_id, p_campaign_id, p_step_number, p_to_email;
  
  -- Generate deterministic idempotency key
  v_idem_key := 'email_' || p_lead_id::text || '_step_' || p_step_number::text;
  RAISE NOTICE '🔑 Using idem_key: %', v_idem_key;
  
  -- Insert with ON CONFLICT to handle race conditions
  -- If duplicate idem_key exists, just return the existing id
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
  ON CONFLICT (idem_key) DO NOTHING
  RETURNING id INTO v_outbox_id;
  
  -- If ON CONFLICT triggered, get the existing id
  IF v_outbox_id IS NULL THEN
    SELECT id INTO v_outbox_id
    FROM email_outbox
    WHERE idem_key = v_idem_key;
    
    RAISE NOTICE '⚠️ Email already queued for lead % step % (id: %)', p_lead_id, p_step_number, v_outbox_id;
  ELSE
    RAISE NOTICE '✅ Successfully queued email for lead % step % (id: %)', p_lead_id, p_step_number, v_outbox_id;
  END IF;
  
  RETURN v_outbox_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '❌ Failed to queue email: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  RAISE WARNING '❌ Details - lead_id=%, campaign_id=%, step=%, template_id=%, to_email=%', 
    p_lead_id, p_campaign_id, p_step_number, p_template_id, p_to_email;
  RETURN NULL;
END;
$$;