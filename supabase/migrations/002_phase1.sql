-- =====================================================================
-- Ryan & Evie — 002: love buttons, notes, goodnight, moods, daily question
-- Paste into Supabase → SQL Editor → New query → Run. Safe to re-run.
-- =====================================================================

-- Little "thinking of you" style taps ------------------------------------------
create table if not exists public.pings (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('thinking','love','miss','hug','kiss')),
  created_at timestamptz not null default now()
);
create index if not exists pings_created_idx on public.pings (created_at desc);
alter table public.pings enable row level security;
drop policy if exists "pings: ours" on public.pings;
create policy "pings: ours" on public.pings for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
drop policy if exists "pings: send" on public.pings;
create policy "pings: send" on public.pings for insert to authenticated
  with check (sender_id = auth.uid());

-- Notes (optionally scheduled) ------------------------------------------------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  deliver_at timestamptz not null default now(),
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notes_deliver_idx on public.notes (deliver_at) where delivered_at is null;
alter table public.notes enable row level security;
drop policy if exists "notes: read" on public.notes;
-- The recipient can't peek at a scheduled note before it arrives.
create policy "notes: read" on public.notes for select to authenticated
  using (sender_id = auth.uid() or (recipient_id = auth.uid() and deliver_at <= now()));
drop policy if exists "notes: send" on public.notes;
create policy "notes: send" on public.notes for insert to authenticated
  with check (sender_id = auth.uid());
drop policy if exists "notes: unsend scheduled" on public.notes;
create policy "notes: unsend scheduled" on public.notes for delete to authenticated
  using (sender_id = auth.uid() and delivered_at is null);

-- Goodnights -------------------------------------------------------------------
create table if not exists public.goodnights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.goodnights enable row level security;
drop policy if exists "goodnights: read" on public.goodnights;
create policy "goodnights: read" on public.goodnights for select to authenticated using (true);
drop policy if exists "goodnights: add" on public.goodnights;
create policy "goodnights: add" on public.goodnights for insert to authenticated
  with check (user_id = auth.uid());

-- Moods ----------------------------------------------------------------------
create table if not exists public.moods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  note text check (note is null or char_length(note) <= 140),
  created_at timestamptz not null default now()
);
alter table public.moods enable row level security;
drop policy if exists "moods: read" on public.moods;
create policy "moods: read" on public.moods for select to authenticated using (true);
drop policy if exists "moods: add" on public.moods;
create policy "moods: add" on public.moods for insert to authenticated
  with check (user_id = auth.uid());

-- Shared settings (one row) ----------------------------------------------------
create table if not exists public.couple_settings (
  id int primary key default 1 check (id = 1),
  next_visit date,
  updated_at timestamptz not null default now()
);
insert into public.couple_settings (id) values (1) on conflict do nothing;
alter table public.couple_settings enable row level security;
drop policy if exists "settings: read" on public.couple_settings;
create policy "settings: read" on public.couple_settings for select to authenticated using (true);
drop policy if exists "settings: edit" on public.couple_settings;
create policy "settings: edit" on public.couple_settings for update to authenticated using (true) with check (true);

-- Daily question -----------------------------------------------------------------
create table if not exists public.question_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  qdate date not null,
  question_index int not null,
  answer text not null check (char_length(answer) between 1 and 1000),
  created_at timestamptz not null default now(),
  unique (user_id, qdate)
);
alter table public.question_answers enable row level security;

-- Helper (security definer avoids a recursive policy)
create or replace function public.has_answered(d date)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.question_answers where user_id = auth.uid() and qdate = d);
$$;

drop policy if exists "answers: read" on public.question_answers;
-- You only see the other person's answer once you've answered that day yourself.
create policy "answers: read" on public.question_answers for select to authenticated
  using (user_id = auth.uid() or public.has_answered(qdate));
drop policy if exists "answers: add" on public.question_answers;
create policy "answers: add" on public.question_answers for insert to authenticated
  with check (user_id = auth.uid());

-- Lets each of us know whether the other has answered today without revealing the answer
create or replace function public.answered_today(d date)
returns table (user_id uuid) language sql security definer stable set search_path = public as $$
  select user_id from public.question_answers where qdate = d;
$$;

-- Server-only tables (no policies = only the server can touch them) -------------
create table if not exists public.push_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  payload jsonb not null,
  send_after timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.push_queue enable row level security;

create table if not exists public.reminders_sent (
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  ref_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, ref_date)
);
alter table public.reminders_sent enable row level security;

-- Live updates ------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['pings','notes','goodnights','moods','question_answers','couple_settings','profiles'] loop
    if not exists (
      select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
