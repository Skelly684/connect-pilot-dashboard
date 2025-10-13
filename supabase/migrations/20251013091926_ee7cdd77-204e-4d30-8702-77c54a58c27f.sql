-- Add missing columns to leads table for enhanced scraper data
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS company_website TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS seniority TEXT,
ADD COLUMN IF NOT EXISTS functional TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS company_size TEXT,
ADD COLUMN IF NOT EXISTS email_status TEXT;