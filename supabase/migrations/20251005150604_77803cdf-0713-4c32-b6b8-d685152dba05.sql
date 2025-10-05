-- Add strict unique constraints to prevent duplicate emails
-- Step 1: Add unique constraint on email_outbox to prevent duplicate queueing
CREATE UNIQUE INDEX IF NOT EXISTS email_outbox_lead_step_uniq 
ON email_outbox(lead_id, step_number) 
WHERE status IN ('queued', 'processing');

-- Step 2: Add function to safely queue emails with idempotency
CREATE OR REPLACE FUNCTION queue_email_step(
  p_lead_id UUID,
  p_campaign_id UUID,
  p_step_number INTEGER,
  p_template_id UUID,
  p_to_email TEXT,
  p_subject TEXT,
  p_body TEXT,
  p_send_after TIMESTAMPTZ DEFAULT NOW()
) RETURNS UUID AS $$
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
  WHERE status IN ('queued', 'processing')
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 3: Add function to atomically claim an email from the queue (with locking)
CREATE OR REPLACE FUNCTION claim_next_email(p_limit INTEGER DEFAULT 1)
RETURNS SETOF email_outbox AS $$
DECLARE
  v_lock_token UUID;
BEGIN
  v_lock_token := gen_random_uuid();
  
  -- Atomically claim emails that are ready to send
  RETURN QUERY
  UPDATE email_outbox
  SET 
    status = 'processing',
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 4: Add function to mark email as sent (with idempotent logging)
CREATE OR REPLACE FUNCTION mark_email_sent(
  p_outbox_id UUID,
  p_lock_token UUID,
  p_provider_message_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_outbox_row email_outbox%ROWTYPE;
  v_log_idem_key TEXT;
BEGIN
  -- Get and validate the outbox entry
  SELECT * INTO v_outbox_row
  FROM email_outbox
  WHERE id = p_outbox_id
    AND lock_token = p_lock_token
    AND status = 'processing'
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 5: Add trigger to auto-queue initial email when lead is accepted
CREATE OR REPLACE FUNCTION auto_queue_initial_email()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign campaigns%ROWTYPE;
  v_template email_templates%ROWTYPE;
BEGIN
  -- Only queue if status changed to 'sent_for_contact' and we have email info
  IF NEW.status = 'sent_for_contact' 
     AND OLD.status != 'sent_for_contact'
     AND NEW.campaign_id IS NOT NULL
     AND NEW.email IS NOT NULL
     AND NEW.next_email_step = 1
  THEN
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
          NEW.email,
          v_template.subject,
          v_template.body,
          NOW()
        );
        
        RAISE NOTICE 'Auto-queued initial email for lead %', NEW.id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_auto_queue_initial_email ON leads;
CREATE TRIGGER trigger_auto_queue_initial_email
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION auto_queue_initial_email();

-- Step 6: Add index on email_logs.idem_key if not exists (for faster duplicate detection)
CREATE UNIQUE INDEX IF NOT EXISTS email_logs_idem_key_uniq ON email_logs(idem_key);

COMMENT ON FUNCTION queue_email_step IS 'Safely queues an email with idempotency guarantee. Returns outbox ID or NULL if already queued.';
COMMENT ON FUNCTION claim_next_email IS 'Atomically claims emails from the queue using row-level locking to prevent duplicates.';
COMMENT ON FUNCTION mark_email_sent IS 'Marks an email as sent with idempotent logging. Validates lock token to prevent race conditions.';