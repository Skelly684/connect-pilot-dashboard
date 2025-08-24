-- Create email_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL DEFAULT 'Scott | PSN',
  email_template_id UUID NULL REFERENCES public.email_templates(id) ON DELETE SET NULL,
  email_daily_cap INTEGER NOT NULL DEFAULT 150,
  caller_prompt TEXT NOT NULL DEFAULT 'Hi, this is Scott from PSN…',
  call_window_start INTEGER NOT NULL DEFAULT 9,
  call_window_end INTEGER NOT NULL DEFAULT 18,
  max_call_retries INTEGER NOT NULL DEFAULT 3,
  retry_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add campaign_id to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS campaign_id UUID NULL REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Create update trigger for campaigns
CREATE OR REPLACE FUNCTION public.campaigns_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_campaigns_updated ON public.campaigns;
CREATE TRIGGER trg_campaigns_updated
BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.campaigns_set_updated_at();

-- Create update trigger for email_templates
CREATE OR REPLACE FUNCTION public.email_templates_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_templates_updated ON public.email_templates;
CREATE TRIGGER trg_email_templates_updated
BEFORE UPDATE ON public.email_templates
FOR EACH ROW EXECUTE FUNCTION public.email_templates_set_updated_at();

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for campaigns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='campaigns' AND policyname='Campaigns Select') THEN
    CREATE POLICY "Campaigns Select" ON public.campaigns FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='campaigns' AND policyname='Campaigns Insert') THEN
    CREATE POLICY "Campaigns Insert" ON public.campaigns FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='campaigns' AND policyname='Campaigns Update') THEN
    CREATE POLICY "Campaigns Update" ON public.campaigns FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Create policies for email_templates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_templates' AND policyname='Email Templates Select') THEN
    CREATE POLICY "Email Templates Select" ON public.email_templates FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_templates' AND policyname='Email Templates Insert') THEN
    CREATE POLICY "Email Templates Insert" ON public.email_templates FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_templates' AND policyname='Email Templates Update') THEN
    CREATE POLICY "Email Templates Update" ON public.email_templates FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON public.campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON public.email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON public.leads(campaign_id);