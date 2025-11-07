-- Create exports storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('exports', 'exports', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own exports"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read their own exports
CREATE POLICY "Users can read their own exports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'exports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own exports
CREATE POLICY "Users can update their own exports"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'exports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own exports
CREATE POLICY "Users can delete their own exports"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'exports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);