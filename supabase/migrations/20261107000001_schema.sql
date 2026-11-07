-- Public profile. A row exists only once onboarding is complete.
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  age          int  not null check (age between 18 and 120),
  avatar_url   text,
  is_seed      boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Private interests. Values are slugs from src/data/options.js.
create table public.profile_private (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  games      text[] not null default '{}',
  hobbies    text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.squads (
  id           uuid primary key default gen_random_uuid(),
  common_games text[] not null default '{}', -- games every member (including wildcard) shares
  created_at   timestamptz not null default now()
);

create table public.squad_members (
  squad_id  uuid not null references public.squads(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (squad_id, user_id)
);
-- v1: a user is in at most one squad. This also stops two
-- simultaneous form-squad calls from grabbing the same person.
create unique index squad_members_one_squad_per_user on public.squad_members(user_id);

-- Server-only. Never exposed to clients.
create table public.match_meta (
  squad_id    uuid not null references public.squads(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  score       numeric not null,              -- Jaccard score vs the user who formed the squad
  is_wildcard boolean not null default false,
  primary key (squad_id, user_id)
);

create table public.messages (
  id         bigint generated always as identity primary key,
  squad_id   uuid not null references public.squads(id) on delete cascade,
  sender_id  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_squad_created_idx on public.messages(squad_id, created_at);

-- Lets clients subscribe to new messages over Realtime.
alter publication supabase_realtime add table public.messages;
