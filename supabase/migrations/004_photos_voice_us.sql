-- =====================================================================
-- Ryan & Evie — 004: photo swap, voice/doodle notes, reactions, "us" info
-- Paste into Supabase → SQL Editor → New query → Run. Safe to re-run.
-- =====================================================================

-- Notes can now be text, a voice note or a doodle, and have reactions
alter table public.notes add column if not exists kind text not null default 'text';
alter table public.notes add column if not exists media_path text;
alter table public.notes add column if not exists reactions jsonb not null default '{}'::jsonb;
alter table public.notes drop constraint if exists notes_kind_check;
alter table public.notes add constraint notes_kind_check check (kind in ('text','voice','doodle'));

-- When we got together (for the "day N together" counter and anniversaries)
alter table public.couple_settings add column if not exists together_since date;

-- Daily photo swap: one photo each per (UK) day
create table if not exists public.photo_swaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pdate date not null,
  path text not null,
  caption text check (caption is null or char_length(caption) <= 140),
  created_at timestamptz not null default now(),
  unique (user_id, pdate)
);
alter table public.photo_swaps enable row level security;
-- Only your own rows via the API; the server shows your partner's once you've both posted.
drop policy if exists "photos: own" on public.photo_swaps;
create policy "photos: own" on public.photo_swaps for select to authenticated using (user_id = auth.uid());

-- Private storage for photos, voice notes and doodles.
-- Each of us can upload only into our own folder; viewing happens through short-lived signed links from the server.
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 10485760)
on conflict (id) do nothing;

drop policy if exists "media: upload own folder" on storage.objects;
create policy "media: upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Live updates
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'photo_swaps'
  ) then
    alter publication supabase_realtime add table public.photo_swaps;
  end if;
end $$;
