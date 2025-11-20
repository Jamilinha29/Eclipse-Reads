-- Allow image uploads in books bucket (for covers subfolder)
-- The books bucket already exists and is public

-- Create policy to allow authenticated users (admins) to upload images
CREATE POLICY "Admins can upload cover images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'books' 
  AND (storage.foldername(name))[1] = 'covers'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Create policy to allow admins to update cover images
CREATE POLICY "Admins can update cover images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'books' 
  AND (storage.foldername(name))[1] = 'covers'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Create policy to allow admins to delete cover images
CREATE POLICY "Admins can delete cover images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'books' 
  AND (storage.foldername(name))[1] = 'covers'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow everyone to view cover images (they're in public bucket)
CREATE POLICY "Anyone can view cover images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'books' 
  AND (storage.foldername(name))[1] = 'covers'
);