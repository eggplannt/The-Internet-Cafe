alter table public.profiles        enable row level security;
alter table public.profile_private enable row level security;
alter table public.squads          enable row level security;
alter table public.squad_members   enable row level security;
alter table public.match_meta      enable row level security;
alter table public.messages        enable row level security;

-- Is the current user a member of this squad?
create or replace function public.is_squad_member(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from squad_members where squad_id = sid and user_id = auth.uid()
  );
$$;

-- Does the current user share a squad with this user?
create or replace function public.shares_squad_with(other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from squad_members a
    join squad_members b on a.squad_id = b.squad_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- profiles: read yourself and your squadmates; write only yourself
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_squad_with(id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- profile_private: owner only
create policy private_select on public.profile_private for select to authenticated
  using (user_id = auth.uid());
create policy private_insert on public.profile_private for insert to authenticated
  with check (user_id = auth.uid());
create policy private_update on public.profile_private for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- squads and squad_members: members can read; nobody writes from the client
create policy squads_select on public.squads for select to authenticated
  using (public.is_squad_member(id));
create policy squad_members_select on public.squad_members for select to authenticated
  using (public.is_squad_member(squad_id));

-- match_meta: RLS on and NO policies = invisible to every client

-- messages: members read and send in their own squad; no edits or deletes in v1
create policy messages_select on public.messages for select to authenticated
  using (public.is_squad_member(squad_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_squad_member(squad_id));
