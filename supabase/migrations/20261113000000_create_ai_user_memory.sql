create table if not exists public.ai_user_memory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  memory_summary text not null check (char_length(memory_summary) <= 1500),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.ai_user_memory enable row level security;
drop policy if exists "Users can read their own AI memory" on public.ai_user_memory;
create policy "Users can read their own AI memory" on public.ai_user_memory for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert their own AI memory" on public.ai_user_memory;
create policy "Users can insert their own AI memory" on public.ai_user_memory for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their own AI memory" on public.ai_user_memory;
create policy "Users can update their own AI memory" on public.ai_user_memory for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own AI memory" on public.ai_user_memory;
create policy "Users can delete their own AI memory" on public.ai_user_memory for delete to authenticated using (auth.uid() = user_id);
create index if not exists ai_user_memory_expires_at_idx on public.ai_user_memory (expires_at);
