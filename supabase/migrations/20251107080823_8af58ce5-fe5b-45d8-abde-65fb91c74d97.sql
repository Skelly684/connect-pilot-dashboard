-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can read their own exports" ON storage.objects;

-- Create a more permissive policy for public bucket access
-- Since the bucket is public, allow anyone to read files
CREATE POLICY "Public read access for exports"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'exports');