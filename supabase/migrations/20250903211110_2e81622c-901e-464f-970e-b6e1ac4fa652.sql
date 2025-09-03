-- Remove duplicate leads, keeping only the most recent one for each user_id + email_address combination
DELETE FROM public.leads 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, email_address) id
  FROM public.leads 
  ORDER BY user_id, email_address, created_at DESC
);

-- Add unique constraint to prevent duplicate leads per user by email
ALTER TABLE public.leads 
ADD CONSTRAINT leads_user_email_unique 
UNIQUE (user_id, email_address);