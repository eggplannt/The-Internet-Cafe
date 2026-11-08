-- Conversation starters: "System" messages the server posts in a squad's chat when it
-- forms and when it goes quiet. Each one gives one member's hobby a natural opening,
-- without ever saying whose hobby it is (see docs/SPEC.md, Chat).

-- 1. messages can now be from a member ('user') or from the app ('system').
--    System messages have no sender. meta holds a riddle's answer: {"answer": "..."}.
alter table public.messages alter column sender_id drop not null;
alter table public.messages
  add column kind text not null default 'user' check (kind in ('user', 'system')),
  add column meta jsonb;
alter table public.messages
  add constraint messages_sender_matches_kind
  check ((kind = 'user' and sender_id is not null) or (kind = 'system' and sender_id is null));

-- 2. Clients may only send plain member messages. System messages come from the
--    server (service role, which bypasses RLS), so nobody can fake one.
drop policy messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (
    kind = 'user'
    and meta is null
    and sender_id = auth.uid()
    and public.is_squad_member(squad_id)
  );

-- 3. Server-only: which member and hobby each starter was built around. Used to rotate
--    the spotlight fairly. RLS on with no policies and no client grants, like match_meta,
--    so no client can ever learn who a starter was "for".
create table public.starter_spotlights (
  id                bigint generated always as identity primary key,
  squad_id          uuid not null references public.squads(id) on delete cascade,
  message_id        bigint not null references public.messages(id) on delete cascade,
  spotlight_user_id uuid references public.profiles(id) on delete cascade, -- null only if nobody in the squad had a hobby
  hobby             text,
  source            text not null check (source in ('llm', 'bank')),
  created_at        timestamptz not null default now()
);
create index starter_spotlights_squad_idx on public.starter_spotlights(squad_id, created_at);

alter table public.starter_spotlights enable row level security;
revoke all on public.starter_spotlights from anon, authenticated;
grant all on public.starter_spotlights to service_role;

-- 4. Which squads should get a starter now? Called only by the post-starters function.
--    a) no starter yet (the one posted at formation failed), once the squad is 5 minutes
--       old, so we don't race the formation starter that's still being written; or
--    b) the last starter is 24h+ old, the chat has been quiet 3h+, and a member has
--       talked since the last starter (no point talking to an empty room).
--    Squads that have waited longest for a starter come first.
create or replace function public.starters_due(max_squads int)
returns table (squad_id uuid)
language sql stable set search_path = public as $$
  with stats as (
    select
      s.id,
      s.created_at,
      (select max(m.created_at) from messages m where m.squad_id = s.id and m.kind = 'system') as last_starter,
      (select max(m.created_at) from messages m where m.squad_id = s.id) as last_message
    from squads s
  )
  select st.id
  from stats st
  where (st.last_starter is null and st.created_at <= now() - interval '5 minutes')
     or (st.last_starter <= now() - interval '24 hours'
         and st.last_message <= now() - interval '3 hours'
         and exists (
           select 1 from messages m
           where m.squad_id = st.id and m.kind = 'user' and m.created_at > st.last_starter))
  order by st.last_starter asc nulls first, st.created_at asc
  limit max_squads;
$$;

revoke execute on function public.starters_due(int) from public, anon, authenticated;
grant execute on function public.starters_due(int) to service_role;

-- Clients keep their existing table-wide select on messages, which covers the new
-- kind and meta columns (Realtime sends them too). Nothing else changes for clients.
