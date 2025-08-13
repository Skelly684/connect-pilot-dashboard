-- Add call tracking fields to leads table
ALTER TABLE public.leads 
ADD COLUMN last_call_status TEXT CHECK (last_call_status IN ('queued', 'scheduled', 'answered', 'no-answer', 'busy', 'failed', 'max-retries')),
ADD COLUMN next_call_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN call_attempts INTEGER DEFAULT 0;

-- Create index for better query performance
CREATE INDEX idx_leads_next_call_at ON public.leads(next_call_at) WHERE next_call_at IS NOT NULL;
CREATE INDEX idx_leads_last_call_status ON public.leads(last_call_status) WHERE last_call_status IS NOT NULL;