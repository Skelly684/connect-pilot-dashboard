-- Fix stuck emails and improve error handling

-- 1. Reset all stuck emails back to queued status
UPDATE email_outbox
SET 
  status = 'queued',
  lock_token = NULL,
  attempts = attempts + 1,
  last_error = 'Reset from stuck sending state',
  updated_at = NOW()
WHERE status = 'sending';

-- 2. Improve cleanup function to be more aggressive
CREATE OR REPLACE FUNCTION public.cleanup_stuck_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Reset emails stuck in 'sending' for more than 2 minutes
  UPDATE email_outbox
  SET 
    status = 'queued',
    lock_token = NULL,
    attempts = attempts + 1,
    last_error = 'Timeout - reset from sending state',
    updated_at = NOW()
  WHERE status = 'sending'
    AND updated_at < NOW() - INTERVAL '2 minutes';
    
  RAISE NOTICE 'Cleaned up stuck emails';
END;
$function$;

-- 3. Delete emails for leads that no longer exist (after 3+ failed attempts)
DELETE FROM email_outbox
WHERE attempts >= 3
  AND lead_id NOT IN (SELECT id FROM leads);

-- 4. Create a function to verify lead exists before queuing
CREATE OR REPLACE FUNCTION public.queue_email_step(
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
SET search_path = public
AS $function$
DECLARE
  v_outbox_id UUID;
  v_idem_key TEXT;
  v_existing_id UUID;
  v_lead_exists BOOLEAN;
BEGIN
  -- Check if lead still exists
  SELECT EXISTS(SELECT 1 FROM leads WHERE id = p_lead_id) INTO v_lead_exists;
  
  IF NOT v_lead_exists THEN
    RAISE NOTICE 'Lead % does not exist, skipping email queue', p_lead_id;
    RETURN NULL;
  END IF;
  
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
$function$;