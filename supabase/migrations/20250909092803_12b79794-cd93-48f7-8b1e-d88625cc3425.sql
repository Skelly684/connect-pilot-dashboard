-- Create CRM integrations table to store API keys and configuration
CREATE TABLE public.crm_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL, -- hubspot, salesforce, pipedrive, etc.
  api_key_encrypted TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_sync BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_settings JSONB DEFAULT '{"sync_replied_leads": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_integrations ENABLE ROW LEVEL SECURITY;

-- Create policies for CRM integrations
CREATE POLICY "Users can manage their own CRM integrations"
ON public.crm_integrations
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create sync log table for tracking
CREATE TABLE public.crm_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL,
  lead_id UUID,
  sync_type TEXT NOT NULL, -- 'lead_sync', 'contact_sync', etc.
  status TEXT NOT NULL, -- 'success', 'failed', 'pending'
  error_message TEXT,
  external_id TEXT, -- ID in the external CRM
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for sync logs
CREATE POLICY "Users can view their own sync logs"
ON public.crm_sync_logs
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.crm_integrations ci 
  WHERE ci.id = crm_sync_logs.integration_id 
  AND ci.user_id = auth.uid()
));

CREATE POLICY "System can insert sync logs"
ON public.crm_sync_logs
FOR INSERT
WITH CHECK (true);

-- Add trigger for updated_at on crm_integrations
CREATE TRIGGER update_crm_integrations_updated_at
  BEFORE UPDATE ON public.crm_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();