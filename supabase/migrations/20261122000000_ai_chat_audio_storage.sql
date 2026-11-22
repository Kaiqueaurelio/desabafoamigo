-- Private storage for large audio attachments in the AI chat.
insert into storage.buckets (id, name, public, file_size_limit)
values ('ai-chat-audio', 'ai-chat-audio', false, null)
on conflict (id) do update set public = false, file_size_limit = null;

drop policy if exists "ai chat audio insert own" on storage.objects;
create policy "ai chat audio insert own"
on storage.objects for insert to authenticated
with check (bucket_id = 'ai-chat-audio' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "ai chat audio read own" on storage.objects;
create policy "ai chat audio read own"
on storage.objects for select to authenticated
using (bucket_id = 'ai-chat-audio' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "ai chat audio delete own" on storage.objects;
create policy "ai chat audio delete own"
on storage.objects for delete to authenticated
using (bucket_id = 'ai-chat-audio' and (storage.foldername(name))[1] = auth.uid()::text);
