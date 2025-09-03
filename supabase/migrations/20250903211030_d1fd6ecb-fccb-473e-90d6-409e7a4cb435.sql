-- Add unique constraint to prevent duplicate leads per user by email
ALTER TABLE public.leads 
ADD CONSTRAINT leads_user_email_unique 
UNIQUE (user_id, email_address);