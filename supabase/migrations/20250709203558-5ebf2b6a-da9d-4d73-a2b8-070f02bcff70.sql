
-- Create a table for storing leads
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT,
  first_name TEXT,
  last_name TEXT,
  job_title TEXT,
  headline TEXT,
  company TEXT,
  company_name TEXT,
  email TEXT,
  email_address TEXT,
  phone TEXT,
  location TEXT,
  raw_address TEXT,
  state_name TEXT,
  city_name TEXT,
  country_name TEXT,
  status TEXT DEFAULT 'new',
  contact_phone_numbers JSONB,
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS) to ensure users can only see their own leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to SELECT their own leads
CREATE POLICY "Users can view their own leads" 
  ON public.leads 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy that allows users to INSERT their own leads
CREATE POLICY "Users can create their own leads" 
  ON public.leads 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy that allows users to UPDATE their own leads
CREATE POLICY "Users can update their own leads" 
  ON public.leads 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy that allows users to DELETE their own leads
CREATE POLICY "Users can delete their own leads" 
  ON public.leads 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create an index for better performance
CREATE INDEX idx_leads_user_id ON public.leads(user_id);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
