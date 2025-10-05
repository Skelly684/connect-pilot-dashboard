-- Fix security issues from previous migration

-- 1. Fix search_path for ensure_email_outbox_idem_key function
CREATE OR REPLACE FUNCTION ensure_email_outbox_idem_key()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.idem_key IS NULL OR NEW.idem_key = '' THEN
    NEW.idem_key := 'auto_' || NEW.lead_id::text || '_step_' ||
                    COALESCE(NEW.step_number::text,'x') || '_' ||
                    extract(epoch from now())::bigint::text;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Enable RLS on email_outbox if not already enabled
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

-- 3. Add RLS policies for email_outbox (service role can manage, users cannot access directly)
DROP POLICY IF EXISTS email_outbox_service_only ON public.email_outbox;
CREATE POLICY email_outbox_service_only ON public.email_outbox
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);