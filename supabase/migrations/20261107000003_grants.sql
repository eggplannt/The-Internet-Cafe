-- Table privileges. RLS decides which ROWS a role sees; these grants decide whether
-- the role can touch the TABLE at all. New Supabase projects no longer grant these
-- automatically, so we spell them out. Each grant is the least the app needs.

-- Start from nothing on every table.
revoke all on public.profiles, public.profile_private, public.squads,
              public.squad_members, public.match_meta, public.messages
  from anon, authenticated;

-- Signed-out visitors (anon) get nothing: every feature needs a sign-in.

-- Signed-in users: exactly what the RLS policies allow, nothing more.
grant select, insert, update on public.profiles        to authenticated;
grant select, insert, update on public.profile_private to authenticated;
grant select                 on public.squads          to authenticated;
grant select                 on public.squad_members   to authenticated;
grant select, insert         on public.messages        to authenticated; -- select is also needed for Realtime
-- match_meta: no grant at all, so it's hidden even if RLS were ever turned off.

-- Server side (form-squad and scripts/) uses the service role, which bypasses RLS.
grant all on public.profiles, public.profile_private, public.squads,
             public.squad_members, public.match_meta, public.messages
  to service_role;

-- RLS helper functions: only signed-in users need them (the policies call them).
revoke execute on function public.is_squad_member(uuid), public.shares_squad_with(uuid)
  from public, anon;
grant execute on function public.is_squad_member(uuid), public.shares_squad_with(uuid)
  to authenticated, service_role;
