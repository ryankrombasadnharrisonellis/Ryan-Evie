-- =====================================================================
-- Ryan & Evie — 003: games + scoreboard
-- Paste into Supabase → SQL Editor → New query → Run. Safe to re-run.
-- All writes go through the server (which checks turns and rules), so these
-- tables only have read policies.
-- =====================================================================

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('ttt','c4','draw','quiz')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  opponent uuid not null references public.profiles(id) on delete cascade,
  turn uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active','finished')),
  winner uuid references public.profiles(id) on delete set null,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists games_status_idx on public.games (status, updated_at desc);
alter table public.games enable row level security;
drop policy if exists "games: ours" on public.games;
create policy "games: ours" on public.games for select to authenticated
  using (created_by = auth.uid() or opponent = auth.uid());

-- Hidden bits (the word to draw, the quiz's right answers). Server only.
create table if not exists public.game_secrets (
  game_id uuid primary key references public.games(id) on delete cascade,
  secret jsonb not null
);
alter table public.game_secrets enable row level security;

-- Daily word game: one row per person per day
create table if not exists public.word_results (
  user_id uuid not null references public.profiles(id) on delete cascade,
  wdate date not null,
  guesses text[] not null default '{}',
  solved boolean not null default false,
  done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, wdate)
);
alter table public.word_results enable row level security;
drop policy if exists "word: own" on public.word_results;
create policy "word: own" on public.word_results for select to authenticated
  using (user_id = auth.uid());

-- Live updates
do $$
declare t text;
begin
  foreach t in array array['games','word_results'] loop
    if not exists (
      select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
