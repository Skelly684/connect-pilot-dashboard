-- Fix email_logs to prevent duplicates and support all statuses

-- Step 1: Expand allowed statuses for email_logs
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_status_check;
ALTER TABLE email_logs ADD CONSTRAINT email_logs_status_check 
  CHECK (status IN ('sent', 'failed', 'queued', 'bounced', 'opened', 'clicked', 'replied', 'sequence_stopped', 'test_sent'));

-- Step 2: Ensure idem_key is truly NOT NULL
-- First set any NULL idem_keys to a default value
UPDATE email_logs SET idem_key = 'legacy_' || id::text WHERE idem_key IS NULL;

-- Now enforce NOT NULL
ALTER TABLE email_logs ALTER COLUMN idem_key SET NOT NULL;

-- Step 3: Fix column naming - ensure to_email column exists
DO $$
BEGIN
  -- Check if to_email column exists, if not check for email_to and rename
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'email_logs' AND column_name = 'to_email'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'email_logs' AND column_name = 'email_to'
    ) THEN
      ALTER TABLE email_logs RENAME COLUMN email_to TO to_email;
    END IF;
  END IF;
END $$;

-- Step 4: Add function to safely log emails with automatic idem_key generation
CREATE OR REPLACE FUNCTION safe_log_email(
  p_lead_id UUID,
  p_campaign_id UUID,
  p_user_id UUID,
  p_to_email TEXT,
  p_subject TEXT,
  p_body TEXT,
  p_status TEXT,
  p_step_number INTEGER DEFAULT NULL,
  p_template_id UUID DEFAULT NULL,
  p_direction TEXT DEFAULT 'outbound',
  p_custom_idem_key TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_idem_key TEXT;
  v_log_id UUID;
BEGIN
  -- Generate idem_key if not provided
  IF p_custom_idem_key IS NOT NULL THEN
    v_idem_key := p_custom_idem_key;
  ELSIF p_step_number IS NOT NULL THEN
    -- For sequenced emails, use lead+step+status
    v_idem_key := 'log_' || p_lead_id::text || '_step_' || p_step_number::text || '_' || p_status;
  ELSE
    -- For other emails, use lead+status+timestamp
    v_idem_key := 'log_' || p_lead_id::text || '_' || p_status || '_' || extract(epoch from now())::bigint::text;
  END IF;

  -- Insert with ON CONFLICT to make it idempotent
  INSERT INTO email_logs (
    lead_id, campaign_id, user_id, to_email, subject, body, 
    status, step_number, template_id, direction, idem_key, created_at
  ) VALUES (
    p_lead_id, p_campaign_id, p_user_id, p_to_email, p_subject, p_body,
    p_status, p_step_number, p_template_id, p_direction, v_idem_key, NOW()
  )
  ON CONFLICT (idem_key) DO NOTHING
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 5: Add trigger to auto-generate idem_key if somehow NULL (failsafe)
CREATE OR REPLACE FUNCTION ensure_email_log_idem_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.idem_key IS NULL OR NEW.idem_key = '' THEN
    NEW.idem_key := 'auto_' || NEW.id::text || '_' || extract(epoch from now())::bigint::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_email_log_idem_key ON email_logs;
CREATE TRIGGER trigger_ensure_email_log_idem_key
  BEFORE INSERT ON email_logs
  FOR EACH ROW
  EXECUTE FUNCTION ensure_email_log_idem_key();

COMMENT ON FUNCTION safe_log_email IS 'Safely logs emails with automatic idempotency key generation. Always use this instead of direct INSERT to prevent duplicates.';
COMMENT ON TRIGGER trigger_ensure_email_log_idem_key ON email_logs IS 'Failsafe: Auto-generates idem_key if NULL or empty on insert.';