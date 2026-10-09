-- =====================================================================
-- Ryan & Evie — 001: accounts, profiles, push subscriptions
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.
-- =====================================================================

-- 1. Only these two emails may ever have an account ---------------------
create table if not exists public.allowed_emails (
  email text primary key
);
alter table public.allowed_emails enable row level security; -- no policies = nobody can read it via the API

insert into public.allowed_emails (email) values
  ('__RYAN_EMAIL__'),
  ('__EVIE_EMAIL__')
on conflict do nothing;

-- Block any sign-up whose email isn't on the list (belt and braces on top of
-- turning sign-ups off in the dashboard).
create or replace function public.enforce_allowed_emails()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.allowed_emails where lower(email) = lower(new.email)) then
    raise exception 'This app is private.';
  end if;
  return new;
end $$;

drop trigger if exists enforce_allowed_emails on auth.users;
create trigger enforce_allowed_emails
  before insert on auth.users
  for each row execute function public.enforce_allowed_emails();

-- 2. Profiles --------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null default '',
  timezone text not null default 'Europe/Copenhagen',
  city text not null default '',
  latitude double precision,
  longitude double precision,
  quiet_start time,          -- e.g. 23:00 (in the person's own time zone)
  quiet_end time,            -- e.g. 08:00
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: both of us can read" on public.profiles;
create policy "profiles: both of us can read" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles: edit your own" on public.profiles;
create policy "profiles: edit your own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Create a profile automatically when an account is created
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, lower(new.email), initcap(split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Back-fill profiles for accounts that already exist
insert into public.profiles (id, email, display_name)
select id, lower(email), initcap(split_part(email, '@', 1)) from auth.users
on conflict (id) do nothing;

-- 3. Push subscriptions (one per device) ------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push: manage your own" on public.push_subscriptions;
create policy "push: manage your own" on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
