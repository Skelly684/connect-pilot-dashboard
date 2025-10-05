-- Step 3: Absolute duplicate prevention (final layer)

-- 1. Prevent multiple queued/processing emails for the same lead + step
CREATE UNIQUE INDEX IF NOT EXISTS email_outbox_lead_step_unique
ON public.email_outbox (lead_id, step_number)
WHERE status IN ('queued', 'processing');

-- 2. Prevent multiple SENT logs for the same lead + step
CREATE UNIQUE INDEX IF NOT EXISTS email_logs_lead_step_sent_unique
ON public.email_logs (lead_id, step_number)
WHERE status = 'sent';

-- 3. Fail-safe trigger to auto-assign idem_key if ever missing
CREATE OR REPLACE FUNCTION ensure_email_outbox_idem_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.idem_key IS NULL OR NEW.idem_key = '' THEN
    NEW.idem_key := 'auto_' || NEW.lead_id::text || '_step_' ||
                    COALESCE(NEW.step_number::text,'x') || '_' ||
                    extract(epoch from now())::bigint::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_outbox_idem_key ON public.email_outbox;
CREATE TRIGGER trg_email_outbox_idem_key
BEFORE INSERT ON public.email_outbox
FOR EACH ROW
EXECUTE FUNCTION ensure_email_outbox_idem_key();