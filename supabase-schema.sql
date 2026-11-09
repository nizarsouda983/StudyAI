-- Run in Supabase SQL editor after creating your project.
create table if not exists public.studyai_data (
 user_id uuid not null references auth.users(id) on delete cascade,
 key text not null check (length(key) between 1 and 120),
 value text not null check (length(value) <= 1000000),
 updated_at timestamptz not null default now(),
 primary key (user_id,key)
);
alter table public.studyai_data enable row level security;
create policy "Owners can read" on public.studyai_data for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners can insert" on public.studyai_data for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owners can update" on public.studyai_data for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owners can delete" on public.studyai_data for delete to authenticated using ((select auth.uid()) = user_id);
