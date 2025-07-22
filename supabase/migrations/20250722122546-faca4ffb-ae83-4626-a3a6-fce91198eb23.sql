-- Update leads table to support the new workflow
-- Add index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);

-- Add index for user_id and status combination for efficient filtering
CREATE INDEX IF NOT EXISTS idx_leads_user_status ON public.leads(user_id, status);

-- Update the status column to have better default and add more status options
-- First, let's make sure all existing leads have a proper status
UPDATE public.leads 
SET status = 'new' 
WHERE status IS NULL OR status = '';

-- Add a constraint to ensure status is one of the valid values
ALTER TABLE public.leads 
ADD CONSTRAINT leads_status_check 
CHECK (status IN ('new', 'pending_review', 'accepted', 'rejected', 'contacted', 'replied', 'qualified', 'not_interested', 'sent_for_contact'));

-- Add additional tracking columns for the workflow
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sent_for_contact_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notes TEXT;