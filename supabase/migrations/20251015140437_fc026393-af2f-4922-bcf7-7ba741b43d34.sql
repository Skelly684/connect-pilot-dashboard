-- Create storage bucket for lead export CSV files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lead-exports',
  'lead-exports',
  false,
  10485760, -- 10MB limit
  ARRAY['text/csv', 'application/vnd.ms-excel', 'application/csv']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (storage.objects RLS is already enabled by Supabase)
-- Allow authenticated users to view their own CSV files
CREATE POLICY "Users can view their own lead export files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'lead-exports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to upload their own CSV files
CREATE POLICY "Users can upload their own lead export files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'lead-exports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own CSV files
CREATE POLICY "Users can delete their own lead export files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'lead-exports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create table to track lead export metadata
CREATE TABLE public.lead_export_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  leads_count INTEGER DEFAULT 0,
  export_source TEXT, -- 'searchleads', 'manual', etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_export_files ENABLE ROW LEVEL SECURITY;

-- Users can view their own export records
CREATE POLICY "Users can view their own lead exports"
ON public.lead_export_files
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own export records
CREATE POLICY "Users can create their own lead exports"
ON public.lead_export_files
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own export records
CREATE POLICY "Users can delete their own lead exports"
ON public.lead_export_files
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_lead_export_files_user_id ON public.lead_export_files(user_id);
CREATE INDEX idx_lead_export_files_created_at ON public.lead_export_files(created_at DESC);