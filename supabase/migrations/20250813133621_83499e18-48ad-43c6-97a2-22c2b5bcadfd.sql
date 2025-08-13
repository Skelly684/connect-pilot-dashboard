
-- Create call_logs table to track all call attempts for leads
CREATE TABLE public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  call_status TEXT NOT NULL CHECK (call_status IN ('queued', 'answered', 'no-answer', 'busy', 'failed')),
  call_duration INTEGER NULL, -- duration in seconds if call was answered
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS) to ensure users can only see call logs for their own leads
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to SELECT call logs for their own leads
CREATE POLICY "Users can view call logs for their own leads" 
  ON public.call_logs 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = call_logs.lead_id 
    AND leads.user_id = auth.uid()
  ));

-- Create policy that allows users to INSERT call logs for their own leads
CREATE POLICY "Users can create call logs for their own leads" 
  ON public.call_logs 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = call_logs.lead_id 
    AND leads.user_id = auth.uid()
  ));

-- Create policy that allows users to UPDATE call logs for their own leads
CREATE POLICY "Users can update call logs for their own leads" 
  ON public.call_logs 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = call_logs.lead_id 
    AND leads.user_id = auth.uid()
  ));

-- Create policy that allows users to DELETE call logs for their own leads
CREATE POLICY "Users can delete call logs for their own leads" 
  ON public.call_logs 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = call_logs.lead_id 
    AND leads.user_id = auth.uid()
  ));

-- Add index for better query performance
CREATE INDEX idx_call_logs_lead_id ON public.call_logs(lead_id);
CREATE INDEX idx_call_logs_created_at ON public.call_logs(created_at DESC);
