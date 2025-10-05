-- Fix claim_next_email to use 'sending' instead of 'processing'
CREATE OR REPLACE FUNCTION public.claim_next_email(p_limit integer DEFAULT 1)
RETURNS SETOF email_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lock_token UUID;
BEGIN
  v_lock_token := gen_random_uuid();
  
  -- Atomically claim emails that are ready to send
  RETURN QUERY
  UPDATE email_outbox
  SET 
    status = 'sending',
    lock_token = v_lock_token,
    updated_at = NOW()
  WHERE id IN (
    SELECT id 
    FROM email_outbox
    WHERE status = 'queued'
      AND send_after <= NOW()
      AND (lock_token IS NULL OR updated_at < NOW() - INTERVAL '5 minutes')
    ORDER BY send_after ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

-- Fix mark_email_sent to check for 'sending' instead of 'processing'
CREATE OR REPLACE FUNCTION public.mark_email_sent(p_outbox_id uuid, p_lock_token uuid, p_provider_message_id text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_outbox_row email_outbox%ROWTYPE;
  v_log_idem_key TEXT;
BEGIN
  -- Get and validate the outbox entry
  SELECT * INTO v_outbox_row
  FROM email_outbox
  WHERE id = p_outbox_id
    AND lock_token = p_lock_token
    AND status = 'sending'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE WARNING 'Email % not found or lock mismatch', p_outbox_id;
    RETURN FALSE;
  END IF;
  
  -- Generate idempotency key for log
  v_log_idem_key := 'sent_' || v_outbox_row.idem_key;
  
  -- Insert into email_logs (idempotent)
  INSERT INTO email_logs (
    lead_id,
    campaign_id,
    step_number,
    template_id,
    to_email,
    subject,
    body,
    status,
    idem_key,
    provider,
    user_id,
    direction,
    created_at
  )
  SELECT 
    v_outbox_row.lead_id,
    v_outbox_row.campaign_id,
    v_outbox_row.step_number,
    v_outbox_row.template_id,
    v_outbox_row.to_email,
    v_outbox_row.subject,
    v_outbox_row.body,
    'sent',
    v_log_idem_key,
    v_outbox_row.provider,
    l.user_id,
    'outbound',
    NOW()
  FROM leads l
  WHERE l.id = v_outbox_row.lead_id
  ON CONFLICT (idem_key) DO NOTHING;
  
  -- Delete from outbox (it's been logged)
  DELETE FROM email_outbox WHERE id = p_outbox_id;
  
  RAISE NOTICE 'Marked email % as sent', p_outbox_id;
  RETURN TRUE;
END;
$$;

-- Fix queue_email_step to use 'queued' or 'sending' in conflict check
CREATE OR REPLACE FUNCTION public.queue_email_step(p_lead_id uuid, p_campaign_id uuid, p_step_number integer, p_template_id uuid, p_to_email text, p_subject text, p_body text, p_send_after timestamp with time zone DEFAULT now())
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_outbox_id UUID;
  v_idem_key TEXT;
BEGIN
  -- Generate deterministic idempotency key
  v_idem_key := 'email_' || p_lead_id::text || '_step_' || p_step_number::text;
  
  -- Try to insert, return existing if duplicate
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
  ON CONFLICT (lead_id, step_number) 
  WHERE status IN ('queued', 'sending')
  DO NOTHING
  RETURNING id INTO v_outbox_id;
  
  -- If we got an ID, it's newly queued
  IF v_outbox_id IS NOT NULL THEN
    RAISE NOTICE 'Queued email for lead % step %', p_lead_id, p_step_number;
  ELSE
    RAISE NOTICE 'Email already queued for lead % step %', p_lead_id, p_step_number;
  END IF;
  
  RETURN v_outbox_id;
END;
$$;

-- Update the unique index to use 'sending' instead of 'processing'
DROP INDEX IF EXISTS email_outbox_lead_step_unique;
CREATE UNIQUE INDEX email_outbox_lead_step_unique
ON public.email_outbox (lead_id, step_number)
WHERE status IN ('queued', 'sending');