-- Bucket avatars (avatar/banner): mesmo padrão dos livros — primeiro segmento do path = user_id.
-- Corrige: StorageApiError "new row violates row-level security policy" no upload.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_users_insert_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "avatars_users_update_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "avatars_users_delete_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "avatars_admins_all" ON storage.objects;

CREATE POLICY "avatars_public_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_users_insert_own_folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "avatars_users_update_own_folder"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "avatars_users_delete_own_folder"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "avatars_admins_all"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'avatars'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'avatars'
  AND public.has_role(auth.uid(), 'admin')
);
