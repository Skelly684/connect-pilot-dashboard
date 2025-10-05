
-- Fix the mark_email_sent function to properly handle logging
CREATE OR REPLACE FUNCTION public.mark_email_sent(
  p_outbox_id uuid,
  p_lock_token uuid,
  p_provider_message_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outbox_row email_outbox%ROWTYPE;
  v_log_idem_key TEXT;
  v_user_id UUID;
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
  
  -- Get user_id from the lead
  SELECT user_id INTO v_user_id
  FROM leads
  WHERE id = v_outbox_row.lead_id;
  
  IF v_user_id IS NULL THEN
    RAISE WARNING 'No user_id found for lead %', v_outbox_row.lead_id;
    -- Still delete from outbox to prevent infinite loop
    DELETE FROM email_outbox WHERE id = p_outbox_id;
    RETURN FALSE;
  END IF;
  
  -- Generate idempotency key for log
  v_log_idem_key := 'sent_' || v_outbox_row.lead_id::text || '_step_' || COALESCE(v_outbox_row.step_number::text, 'x');
  
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
  VALUES (
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
    v_user_id,
    'outbound',
    NOW()
  )
  ON CONFLICT (idem_key) DO UPDATE
  SET updated_at = NOW();
  
  -- Delete from outbox (it's been logged)
  DELETE FROM email_outbox WHERE id = p_outbox_id;
  
  RAISE NOTICE 'Marked email % as sent', p_outbox_id;
  RETURN TRUE;
END;
$$;
