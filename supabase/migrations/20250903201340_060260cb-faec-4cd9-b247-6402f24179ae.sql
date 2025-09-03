-- Enable RLS on lead_email_sends table (this table seems to be missing RLS)
ALTER TABLE public.lead_email_sends ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lead_email_sends
CREATE POLICY "Users can manage email sends for their own leads"
ON public.lead_email_sends
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.leads 
  WHERE leads.id = lead_email_sends.lead_id 
  AND leads.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.leads 
  WHERE leads.id = lead_email_sends.lead_id 
  AND leads.user_id = auth.uid()
));