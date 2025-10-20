-- Add RLS policies for exports bucket to allow users to update their own files

-- Policy to allow users to upload files to exports bucket
CREATE POLICY "Users can upload to exports bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exports' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to update their own files in exports bucket  
CREATE POLICY "Users can update their own files in exports"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to delete their own files in exports bucket
CREATE POLICY "Users can delete their own files in exports"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to read files from exports bucket
CREATE POLICY "Users can read from exports bucket"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);