-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION ensure_single_default_campaign() 
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Set all other campaigns for this user to not default
    UPDATE campaigns 
    SET is_default = false 
    WHERE user_id = NEW.user_id 
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;