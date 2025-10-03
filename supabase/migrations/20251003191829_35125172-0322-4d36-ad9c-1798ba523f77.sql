-- Fix search path for the function we just created
ALTER FUNCTION update_lead_status_on_answered_call() SET search_path = public;