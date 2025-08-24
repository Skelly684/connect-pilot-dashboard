-- Add is_default column to campaigns table to track which campaign should be used for new leads
ALTER TABLE campaigns ADD COLUMN is_default boolean DEFAULT false;

-- Ensure only one campaign can be default per user
CREATE OR REPLACE FUNCTION ensure_single_default_campaign() 
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to ensure only one default campaign
CREATE TRIGGER trigger_ensure_single_default_campaign
  BEFORE UPDATE OR INSERT ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_campaign();