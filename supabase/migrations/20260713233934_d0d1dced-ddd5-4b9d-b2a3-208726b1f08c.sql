
CREATE POLICY "Users read own lgpd export files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'lgpd-exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
