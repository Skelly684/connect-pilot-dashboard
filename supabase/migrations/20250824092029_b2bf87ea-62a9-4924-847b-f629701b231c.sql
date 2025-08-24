-- Create email_logs table
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  email_to TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent','failed')),
  error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_email_logs_lead_id ON public.email_logs(lead_id);
CREATE INDEX idx_email_logs_created_at ON public.email_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own email logs"
  ON public.email_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = email_logs.lead_id AND leads.user_id = auth.uid()));

CREATE POLICY "Users can insert email logs for their own leads"
  ON public.email_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = email_logs.lead_id AND leads.user_id = auth.uid()));