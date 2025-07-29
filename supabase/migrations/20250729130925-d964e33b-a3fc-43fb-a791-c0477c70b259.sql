-- Create call_logs table
CREATE TABLE public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  call_status TEXT NOT NULL,
  call_duration INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - users can only access call logs for their own leads
CREATE POLICY "Users can view call logs for their own leads" 
ON public.call_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = call_logs.lead_id 
    AND leads.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create call logs for their own leads" 
ON public.call_logs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = call_logs.lead_id 
    AND leads.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update call logs for their own leads" 
ON public.call_logs 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = call_logs.lead_id 
    AND leads.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete call logs for their own leads" 
ON public.call_logs 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = call_logs.lead_id 
    AND leads.user_id = auth.uid()
  )
);

-- Create index for better performance on lead_id lookups
CREATE INDEX idx_call_logs_lead_id ON public.call_logs(lead_id);
CREATE INDEX idx_call_logs_created_at ON public.call_logs(created_at);