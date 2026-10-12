-- =====================================================================
-- Ryan & Evie — 005: SOS (call needed, FaceTime, attention, annoy)
-- Paste into Supabase → SQL Editor → New query → Run. Safe to re-run.
-- =====================================================================

-- Phone number or Apple ID email, so the other person can call/FaceTime you in one tap
alter table public.profiles add column if not exists facetime text
  check (facetime is null or char_length(facetime) <= 80);

create table if not exists public.sos (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('call','facetime','attention','annoy')),
  message text,
  acked_at timestamptz,
  ack text,
  created_at timestamptz not null default now()
);
create index if not exists sos_recent_idx on public.sos (created_at desc);
alter table public.sos enable row level security;
drop policy if exists "sos: ours" on public.sos;
create policy "sos: ours" on public.sos for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sos'
  ) then
    alter publication supabase_realtime add table public.sos;
  end if;
end $$;
