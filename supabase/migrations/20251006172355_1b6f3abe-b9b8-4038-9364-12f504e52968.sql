-- Fix: Make email_logs.lead_id nullable and remove foreign key constraint
-- This prevents email sending from failing when leads are deleted

ALTER TABLE email_logs 
ALTER COLUMN lead_id DROP NOT NULL;

-- Drop the foreign key constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'email_logs_lead_id_fkey'
  ) THEN
    ALTER TABLE email_logs DROP CONSTRAINT email_logs_lead_id_fkey;
  END IF;
END $$;

-- Update the safe_log_email function to handle missing leads gracefully
CREATE OR REPLACE FUNCTION public.safe_log_email(
  p_lead_id uuid,
  p_campaign_id uuid,
  p_user_id uuid,
  p_to_email text,
  p_subject text,
  p_body text,
  p_status text,
  p_step_number integer DEFAULT NULL,
  p_template_id uuid DEFAULT NULL,
  p_direction text DEFAULT 'outbound',
  p_custom_idem_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_idem_key TEXT;
  v_log_id UUID;
BEGIN
  -- Generate idem_key if not provided
  IF p_custom_idem_key IS NOT NULL THEN
    v_idem_key := p_custom_idem_key;
  ELSIF p_step_number IS NOT NULL THEN
    v_idem_key := 'log_' || COALESCE(p_lead_id::text, 'null') || '_step_' || p_step_number::text || '_' || p_status;
  ELSE
    v_idem_key := 'log_' || COALESCE(p_lead_id::text, 'null') || '_' || p_status || '_' || extract(epoch from now())::bigint::text;
  END IF;

  -- Insert with ON CONFLICT to make it idempotent
  -- Lead ID can be null if lead was deleted
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
$function$;