-- Waiting list for matchmaking. A row means "this real user is looking for a squad".
-- Seeds never get rows: the matcher treats every unmatched seed as available.
create table public.match_queue (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  joined_at    timestamptz not null default now(), -- place in line; longest wait is matched first
  last_seen_at timestamptz not null default now()  -- refreshed by join-queue; stale rows are dropped
);

alter table public.match_queue enable row level security;

-- You can see your own queue row and leave the queue. Joining goes through the
-- join-queue function, so nobody can set their own joined_at to cut the line.
create policy queue_select on public.match_queue for select to authenticated
  using (user_id = auth.uid());
create policy queue_delete on public.match_queue for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.match_queue from anon, authenticated;
grant select, delete on public.match_queue to authenticated;
grant all on public.match_queue to service_role;

-- Lets the waiting page hear the moment its squad_members row is created.
alter publication supabase_realtime add table public.squad_members;
