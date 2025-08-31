-- Add delivery_rules column to campaigns table
ALTER TABLE campaigns 
ADD COLUMN delivery_rules JSONB DEFAULT '{
  "use_email": true,
  "use_calls": true,
  "call": {
    "max_attempts": 3,
    "retry_minutes": 30,
    "window_start": 9,
    "window_end": 18
  },
  "email": {
    "send_initial": true
  }
}'::jsonb;