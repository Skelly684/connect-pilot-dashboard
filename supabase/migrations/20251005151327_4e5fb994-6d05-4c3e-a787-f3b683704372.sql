-- Fix search_path for security on new functions

-- Set search_path on safe_log_email
ALTER FUNCTION safe_log_email(uuid, uuid, uuid, text, text, text, text, integer, uuid, text, text) 
  SET search_path = public;

-- Set search_path on ensure_email_log_idem_key
ALTER FUNCTION ensure_email_log_idem_key() 
  SET search_path = public;