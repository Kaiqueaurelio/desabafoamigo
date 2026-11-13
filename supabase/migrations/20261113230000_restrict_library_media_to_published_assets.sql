-- Restrict library-media reads to assets referenced by published library content.
-- The bucket remains private. Authenticated app users (including anonymous-auth
-- sessions) may read only published media; administrators may also read drafts.
drop policy if exists "library media read" on storage.objects;

drop policy if exists "library media read published assets" on storage.objects;
create policy "library media read published assets"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'library-media'
  and (
    has_role(auth.uid(), 'admin'::app_role)
    or exists (
      select 1
      from public.library_audios as a
      where a.published is true
        and (a.audio_url = objects.name or a.cover_url = objects.name)
    )
    or exists (
      select 1
      from public.library_images as i
      where i.published is true
        and i.image_url = objects.name
    )
  )
);
