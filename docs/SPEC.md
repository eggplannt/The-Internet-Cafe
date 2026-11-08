# Internet Cafe — Technical Spec (v1)

Nov 7, 2026 · @Ajibola Oguntade

## How to use this doc

This doc is the only source of truth for v1. The frontend and backend teams' Claude Code sessions both build against the contracts in it. If the code and the doc disagree, change one of them and tell the other team.

Set up the repo so Claude Code reads it every session:

1. Export this doc as Markdown and commit it as `docs/SPEC.md`. Re-export it whenever a contract changes.
2. Commit the `CLAUDE.md` below at the repo root.
3. Start every Claude Code session with: "Read CLAUDE.md and docs/SPEC.md, then do X."

```markdown
# Internet Cafe

Spec: docs/SPEC.md. Read it before any change.

- Frontend work lives in site/src/. Backend work lives in supabase/ and scripts/.
- Contracts: table names, columns, RLS, the form-squad request/response, and the function list in site/src/backend-tools/.
  Don't change a contract without updating docs/SPEC.md and telling the other team.
- Never use the service-role key in site/src/. The browser only uses VITE_SUPABASE_PUBLISHABLE_KEY.
- Never show users other people's games or hobbies, match scores, or who the wildcard is. The one exception is the squad's common game(s), which every member sees.
- Out of scope for v1: twin hunt, rewards, co-op game, presence, hours bar, graduation. Don't build them.
- No new npm packages without asking.
- Write plain, readable code with short comments on the why. Every teammate must be able to explain every file to judges.
- After each session, add a line to docs/AI_USE.md: date, who, what Claude Code did.
```

The last rule matters for Devpost. Undisclosed AI use, or a teammate who can't explain the code, can get us disqualified.

## Scope

v1 is four real features: Google sign-in, onboarding, matchmaking into a squad, and live squad chat. Everything else waits until those four work on the deployed URL.

| Feature | v1 | What "done" means |
| --- | --- | --- |
| Google sign-in | In | A new Google account can sign in on the deployed URL |
| Onboarding | In | Name, age (18+), games, hobbies saved to the database |
| Matchmaking | In | "Find my squad" runs the real Jaccard matching and creates a squad of 3–5 with 1 hidden wildcard |
| Squad page | In | Shows members' names and avatars, plus the game the whole squad has in common. Never anyone's full games or hobbies |
| Squad chat | In | Two real accounts in one squad see each other's messages live |
| Seeded pool | In | \~40 seeded users so matching has people to match against |
| Twin hunt | Later | — |
| Surprise rewards | Later | — |
| Co-op game as first contact | Later | In v1, chat is open as soon as the squad forms |
| Presence (who's online) | Later | — |
| Hours bar, exploring, graduation | Later | — |
| No-shows rule | Later | Still an open decision |

Adding a later feature means a new migration plus new pages. Nothing in v1 needs to change shape for it.

## Architecture

The React app talks straight to Supabase with the public publishable key, and row-level security decides what each user can read or write. The one exception is matchmaking. It runs in a server-side Edge Function, because it has to read everyone's private interests.

&#91;embedded content: v1 architecture · React app, Supabase, Google\]

In text, for anyone reading the Markdown export:

1. **Sign in:** the browser calls Supabase Auth, which hands off to Google OAuth and returns a session.
2. **Onboarding:** the browser writes its own `profiles` and `profile_private` rows directly. RLS allows only your own rows.
3. **Matchmaking:** the browser invokes the `form-squad` Edge Function. The function reads the private interests of everyone in the pool with the service-role key, writes `squads`, `squad_members` and `match_meta`, and returns only a `squad_id`.
4. **Chat:** the browser inserts into `messages`. Postgres streams each insert through Realtime to every subscribed squad member, filtered by RLS.

| Layer | Choice |
| --- | --- |
| Frontend | React + Vite, Tailwind CSS, react-router, `@supabase/supabase-js` v2, TypeScript (TSX) |
| Hosting | Vercel, deploying from `main` |
| Auth | Supabase Auth, Google provider |
| Database | Supabase Postgres with RLS on every table |
| Server logic | One Supabase Edge Function (Deno, TypeScript): `form-squad` |
| Realtime | Supabase Realtime `postgres_changes` on `messages` |

## Setup

One backend person owns the Supabase project and the Google OAuth client, and should finish both before 8 PM Saturday, while mentors are still here. Google OAuth redirect URLs are the most common time sink, so get sign-in working on the deployed URL early.

**Supabase project**

1. Create the project on supabase.com and invite every teammate to the organization.
2. In the repo: `npm i -D supabase`, then `npx supabase login`, `npx supabase init`, `npx supabase link --project-ref <ref>`.
3. Apply migrations: `npx supabase db push`.
4. Deploy the function: `npx supabase functions deploy form-squad`.

**Google sign-in**

1. In Google Cloud Console, create an OAuth consent screen (External) with the `email` and `profile` scopes.
2. Set the consent screen's publishing status to **In production**. In Testing mode, only listed test users can sign in, and judges won't be on that list.
3. Create an OAuth client ID of type Web application. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
4. In Supabase → Authentication → Providers → Google, paste the client ID and secret and turn the provider on.
5. In Supabase → Authentication → URL Configuration, set Site URL to the deployed URL. Add both `http://localhost:5173/**` and `https://<deployed-domain>/**` to Redirect URLs.

**Environment variables**

| Variable | Where it lives | Used by |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `site/.env.local` and the hosting dashboard | Frontend |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `site/.env.local` and the hosting dashboard | Frontend (public, safe to ship) |
| `SUPABASE_URL` | Your shell, only when running scripts | `scripts/seed.mjs`, `scripts/reset-squads.mjs` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your shell, only when running scripts | Scripts. Never in `site/src/`, never committed |

Edge Functions get `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` automatically, so nothing needs setting there (`SUPABASE_ANON_KEY` there is Supabase's own name; the frontend uses the publishable key). Commit `site/.env.example` with empty values, and add `.env.local` to `.gitignore`. Run the scripts from the repo root after `npm install`: `npm run seed`, `npm run reset-squads`.

**Deploy**

Deploy the frontend to Vercel from the GitHub repo, with the two `VITE_` variables set. Set the Vercel root directory to `site/`. Add a `site/vercel.json` with `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` so react-router routes work on refresh.

## Repo structure and ownership

Everything lives in one GitHub repo. The frontend team owns `site/`, the backend team owns `supabase/` and `scripts/`, and both teams share `docs/` and the vocabulary file.

```
internet-cafe/
  CLAUDE.md                      # rules for Claude Code (see "How to use this doc")
  docs/
    SPEC.md                      # this doc, exported as Markdown
    AI_USE.md                    # running log for the Devpost AI disclosure
  .env.example
  package.json                   # @supabase/supabase-js for scripts/ only

  supabase/                      # BACKEND
    config.toml
    migrations/
      20261107000001_schema.sql  # tables
      20261107000002_rls.sql     # row-level security + helper functions
    functions/
      _shared/cors.ts
      _shared/matching.ts        # pure scoring + squad building, no database calls
      form-squad/index.ts        # the matchmaking endpoint

  scripts/                       # BACKEND, run locally with the service-role key
    seed-data.json               # ~40 seeded gamers
    seed.mjs
    reset-squads.mjs             # clears all squads before a demo

  site/                          # FRONTEND (Vite app)
    .env.example
    vercel.json
    package.json                 # Vite + React + Tailwind + react-router + @supabase/supabase-js
    src/
      main.tsx
      App.tsx                      # routes
      data/options.ts              # SHARED: the list of allowed games and hobbies
      backend-tools/
        supabase.ts                # the only createClient() call
        auth.ts                    # signInWithGoogle, signOut
        profile.ts                 # getMyProfile, saveOnboarding
        squad.ts                   # getMySquad, formSquad, nextRoute
        messages.ts                # listMessages, sendMessage, subscribeToMessages
        index.ts                   # re-exports everything — pages import from here
      hooks/
        useAuth.tsx                # AuthProvider + useAuth()
        useProfile.ts
        useSquad.ts
        useChat.ts
      pages/
        Landing.tsx
        Onboarding.tsx
        FindSquad.tsx
        Squad.tsx                  # members + chat
      components/
        ProtectedRoute.tsx
        Avatar.tsx
        TagPicker.tsx
        MemberCard.tsx
        MessageList.tsx
        MessageInput.tsx
```

| Path | Owner | Notes |
| --- | --- | --- |
| `supabase/migrations/` | Backend | Schema and RLS are contracts. Frontend reads them, never edits them |
| `supabase/functions/` | Backend | Request and response shapes are a contract (see Matchmaking) |
| `scripts/` | Backend | Uses the service-role key. Never imported by `site/src/` |
| `site/src/backend-tools/` | Frontend | The function list is a contract (see Frontend). Pages never call `supabase` directly |
| `site/src/data/options.ts` | Shared | The seed data and the onboarding picker both use these exact values |
| `site/src/pages/`, `site/src/components/`, `site/src/hooks/` | Frontend | One owner per page, so people can work in parallel |
| `docs/`, `CLAUDE.md` | Shared | Update the spec first, then the code |

`site/src/data/options.ts` exports `GAMES` and `HOBBIES` as arrays of `{ value, label }`. Each `value` is a lowercase slug such as `valorant` or `rock-climbing`. Matching compares these slugs, so free-text tags aren't allowed in v1.

## Database schema

There are six tables, and the split between them is what enforces hidden matching. Public profile fields live in `profiles`. Games and hobbies live in `profile_private`, which only its owner can read. Scores and wildcard flags live in `match_meta`, which no client can read.

| Table | Holds | Who can read it |
| --- | --- | --- |
| `profiles` | Display name, age, avatar, seed flag | You and your squadmates |
| `profile_private` | Games and hobbies | Only you |
| `squads` | One row per squad, plus the games every member (wildcard included) shares | Its members |
| `squad_members` | Who is in which squad (one squad per user in v1) | Members of that squad |
| `match_meta` | Match score and wildcard flag per member | Nobody except the server |
| `messages` | Squad chat | Members of that squad |

`supabase/migrations/20261107000001_schema.sql`:

```sql
-- Public profile. A row exists only once onboarding is complete.
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  age          int  not null check (age between 18 and 120),
  avatar_url   text,
  is_seed      boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Private interests. Values are slugs from site/src/data/options.ts.
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
```

There's no trigger that creates a profile on sign-up. The frontend inserts `profiles` when onboarding is submitted, so "has a profiles row" means "finished onboarding".

## Row-level security

RLS is on for every table, and clients can only write their own profile, their own interests and their own chat messages. Squads, memberships and match data are written only by the `form-squad` function using the service-role key, which bypasses RLS.

The two helper functions are `security definer` on purpose. A policy on `squad_members` that queries `squad_members` directly causes an infinite-recursion error in Postgres.

`supabase/migrations/20261107000002_rls.sql`:

```sql
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
```

Realtime `postgres_changes` applies the `messages_select` policy, so people only receive messages from their own squad.

**Checks the backend must pass before telling the frontend it's ready.** Run each one signed in as a normal user, in the browser console or a test page:

- [ ] `select * from profile_private` returns only your own row
- [ ] `select * from match_meta` returns zero rows
- [ ] `select * from profiles` returns only you and your squadmates
- [ ] Inserting a message into another squad fails

## Auth and onboarding

Supabase Auth handles Google sign-in end to end, so the app has no auth server code. Where a user lands depends on whether they've signed in, finished onboarding and joined a squad.

**Sign-in**

```js
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: window.location.origin + '/' },
})
```

supabase-js picks up the session from the redirect automatically, so there's no callback page. `AuthProvider` reads `supabase.auth.getSession()` on load and listens with `supabase.auth.onAuthStateChange`. Sign-out is `supabase.auth.signOut()`.

**Where a user lands.** All routing decisions go through one function, `nextRoute()` in `site/src/backend-tools/`, so every page agrees:

| State | Route |
| --- | --- |
| No session | `/` |
| Session, no `profiles` row | `/onboarding` |
| Profile, not in a squad | `/find` |
| In a squad | `/squad` |

**Onboarding form**

| Field | Rule | Saved to |
| --- | --- | --- |
| Display name | Required, 1–40 characters. Prefill from Google `user.user_metadata.full_name` | `profiles.display_name` |
| Age | Required number, 18 or over | `profiles.age` |
| Games | At least 1, picked from `GAMES` | `profile_private.games` |
| Hobbies | At least 1, picked from `HOBBIES` | `profile_private.hobbies` |
| Avatar | Not asked. Taken from Google `user.user_metadata.avatar_url` | `profiles.avatar_url` |

On submit, upsert `profiles` first, then `profile_private`, because `profile_private` references `profiles`. If the age is under 18, show a short message saying the app is 18+ for now, save nothing, and sign the user out. The database `check` constraint backs this up.

Tell users in one line on this screen: "We use your games and hobbies to build your squad. We never show them to anyone."

## Matchmaking

One Edge Function, `form-squad`, builds the calling user's squad on the spot from everyone who isn't in a squad yet. It scores each person by overlap (Jaccard similarity), takes the closest matches and adds one hidden wildcard. It returns only a squad ID.

**Contract (frontend and backend both build to this)**

|  |  |
| --- | --- |
| Endpoint | `POST /functions/v1/form-squad` |
| Call from the frontend | `supabase.functions.invoke('form-squad', { body: {} })`, which attaches the user's token automatically |
| Request body | `{}` |
| 200 | `{ "squad_id": "<uuid>", "already_in_squad": false }` |
| 200 (already in a squad) | `{ "squad_id": "<uuid>", "already_in_squad": true }`. Calling it twice is safe |
| 401 | `{ "error": "not_signed_in" }` |
| 400 | `{ "error": "onboarding_incomplete" }` (no `profile_private` row) |
| 409 | `{ "error": "not_enough_people" }` (fewer than 2 others who share a game with the caller) |
| 500 | `{ "error": "internal" }` |

The response never includes scores, wildcard flags, or anyone's games or hobbies.

**Algorithm** (`supabase/functions/_shared/matching.ts`: pure functions, no database calls, so it's easy to test and explain)

1. Turn each user into a set of tags, with games prefixed `g:` and hobbies `h:`, so a game and a hobby with the same name don't count as a match.
2. Score = shared tags ÷ all distinct tags across both users. 0 means nothing in common, 1 means identical. If both sets are empty, the score is 0.
3. **Every member, wildcard included, must share at least one game with the whole squad.** `commonGames` starts as the caller's games. Someone is only added if they play at least one game still in `commonGames`, and adding them narrows `commonGames` to the games they also play. So `commonGames` is never empty, and every member sees the same game(s) on the Squad page.
4. Score everyone in the pool who shares a game with the caller, highest first (ties go to whoever signed up first).
5. Squad size is the caller plus up to 4 others. Walk down the scored list and take up to 3 close matches, skipping anyone who would leave `commonGames` empty. If fewer than 2 are found, return `not_enough_people`.
6. Then add 1 wildcard: the lowest-scoring person left who still plays a game in `commonGames`.
7. If nobody qualifies as a wildcard but there are 3 close matches, the lowest-scoring of those 3 becomes the wildcard. With only 2 others there is no wildcard.

```ts
export type Candidate = { id: string; games: string[]; hobbies: string[]; createdAt: string };
export type Pick = { id: string; score: number; isWildcard: boolean };
export type SquadResult = { picks: Pick[]; commonGames: string[] };

const tags = (c: Candidate) =>
  new Set([...c.games.map((g) => `g:${g}`), ...c.hobbies.map((h) => `h:${h}`)]);

export function jaccard(a: Candidate, b: Candidate): number {
  const A = tags(a), B = tags(b);
  const shared = [...A].filter((t) => B.has(t)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : shared / union;
}

export function sharesGame(a: Candidate, b: Candidate): boolean {
  return a.games.some((g) => b.games.includes(g));
}

export function buildSquad(caller: Candidate, pool: Candidate[], maxOthers = 4): SquadResult | null {
  const scored = pool
    .filter((c) => sharesGame(caller, c))
    .map((c) => ({ c, score: jaccard(caller, c) }))
    .sort((x, y) => y.score - x.score || x.c.createdAt.localeCompare(y.c.createdAt));

  // Games the whole squad plays so far. We only add someone if this stays non-empty,
  // so every member (wildcard included) is guaranteed at least one game in common.
  let commonGames = caller.games;
  const keepsCommon = (c: Candidate) => commonGames.some((g) => c.games.includes(g));
  const add = (c: Candidate) => { commonGames = commonGames.filter((g) => c.games.includes(g)); };

  // Closest matches first, up to 3
  const close: { c: Candidate; score: number }[] = [];
  for (const s of scored) {
    if (close.length === maxOthers - 1) break;
    if (keepsCommon(s.c)) { close.push(s); add(s.c); }
  }
  if (close.length < 2) return null;

  // Wildcard: the lowest-scoring remaining person who still shares the squad's game
  const rest = scored.filter((s) => !close.includes(s)).reverse();
  let wild = rest.find((s) => keepsCommon(s.c));
  if (wild) add(wild.c);
  // Only 3 others available: the furthest of them becomes the wildcard
  else if (close.length === 3) wild = close.pop();

  const picks: Pick[] = [
    { id: caller.id, score: 1, isWildcard: false },
    ...close.map(({ c, score }) => ({ id: c.id, score, isWildcard: false })),
    ...(wild ? [{ id: wild.c.id, score: wild.score, isWildcard: true }] : []),
  ];
  return { picks, commonGames };
}
```

**What `form-squad/index.ts` does, in order**

1. Answer the CORS preflight, using the headers from `_shared/cors.ts`.
2. Make a client with the anon key plus the request's `Authorization` header, and call `auth.getUser()`. If there's no user, return 401.
3. Make an admin client with `SUPABASE_SERVICE_ROLE_KEY` for everything after this.
4. If the caller already has a `squad_members` row, return that `squad_id` with `already_in_squad: true`.
5. Load the caller's `profile_private` row. If there isn't one, return 400.
6. Load the pool: every `profile_private` row joined to `profiles.created_at`, minus the caller, minus anyone already in `squad_members`. Filtering in TypeScript is fine at this scale.
7. Run `buildSquad`. If it returns `null`, return 409.
8. Insert one `squads` row with `common_games` set to the result. Insert all `squad_members` rows **in one insert call**, then all `match_meta` rows.
9. If the member insert fails with a unique violation (`23505`, someone else grabbed a person first), delete the new squad and retry from step 6, at most twice.
10. Return `{ squad_id, already_in_squad: false }`.

**Frontend stub.** Until the real function is deployed, the backend team deploys a version that returns `{ squad_id, already_in_squad: false }` for a squad created by hand. That way the frontend is never blocked.

## Chat

Chat is a plain `messages` table plus a Supabase Realtime subscription, so there's no chat server to build. RLS decides who can read and send, and chat is open as soon as the squad forms.

**Load history** (oldest first, up to 200; plenty for a hackathon):

```js
const { data, error } = await supabase
  .from('messages')
  .select('id, squad_id, sender_id, body, created_at')
  .eq('squad_id', squadId)
  .order('created_at', { ascending: true })
  .limit(200)
```

**Subscribe to new messages:**

```js
const channel = supabase
  .channel(`squad:${squadId}`)
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', filter: `squad_id=eq.${squadId}` },
    (payload) => onInsert(payload.new),
  )
  .subscribe()

// on unmount
supabase.removeChannel(channel)
```

**Send a message:**

```js
await supabase.from('messages').insert({ squad_id: squadId, body: text.trim() })
// sender_id defaults to auth.uid() in the database
```

Rules for the frontend:

- Don't add the sent message to the list yourself. It arrives through the subscription like everyone else's. Skip any message whose `id` is already in the list.
- Show sender names by looking up `sender_id` in the squad member list from `getMySquad()`. Don't run an extra query per message.
- Trim the text. Disable Send when it's empty or over 2000 characters. Enter sends, Shift+Enter adds a new line.
- Show messages in a `role="log"` region with `aria-live="polite"` so screen readers announce new ones.

Seeded users don't reply in v1. The demo uses two real accounts in the same squad.

## Frontend

The frontend is four routes, and every page talks to Supabase only through `site/src/backend-tools/`. Backend changes then touch one directory, and the backend team can check those files against this spec.

**Routes** (`site/src/App.tsx`, react-router)

| Path | Page | Guard | Shows |
| --- | --- | --- | --- |
| `/` | `Landing.jsx` | Public. Signed-in users are redirected by `nextRoute()` | Pitch line + "Continue with Google" |
| `/onboarding` | `Onboarding.jsx` | Session, no profile | The onboarding form |
| `/find` | `FindSquad.jsx` | Profile, no squad | "Find my squad" button, loading state, friendly `not_enough_people` message |
| `/squad` | `Squad.jsx` | In a squad | Member cards (name + avatar only), the shared game(s), and the chat |
| `*` | — | — | Redirect to `/` |

`ProtectedRoute` waits for auth to load, calls `nextRoute()`, and redirects if the current path doesn't match.

**`site/src/backend-tools/` (contract)**

Every function is `async`. It returns plain data, or throws an `Error` with a `.code` string the page can switch on.

| Function | Returns | Error codes |
| --- | --- | --- |
| `signInWithGoogle()` | nothing (redirects) | — |
| `signOut()` | nothing | — |
| `getMyProfile()` | `{ id, display_name, age, avatar_url }` or `null` | — |
| `saveOnboarding({ display_name, age, games, hobbies })` | nothing | `under_18`, `invalid` |
| `getMySquad()` | `{ squad_id, common_games: string[], members: [{ id, display_name, avatar_url }] }` or `null` | — |
| `formSquad()` | `{ squad_id, already_in_squad }` | `not_signed_in`, `onboarding_incomplete`, `not_enough_people`, `internal` |
| `nextRoute()` | `'/'`, `'/onboarding'`, `'/find'` or `'/squad'` | — |
| `listMessages(squadId)` | `Message[]` | — |
| `sendMessage(squadId, body)` | nothing | `invalid` |
| `subscribeToMessages(squadId, onInsert)` | an `unsubscribe()` function | — |

`Message` = `{ id: number, squad_id: string, sender_id: string, body: string, created_at: string }`.

Implementation notes:

- `getMySquad()`: first read your own `squad_members` row to get `squad_id`. Then fetch `squads` to get `common_games`. Then run `supabase.from('squad_members').select('user_id, profiles(id, display_name, avatar_url)').eq('squad_id', squadId)`.
- `formSquad()`: on a non-2xx response, `supabase.functions.invoke` returns an `error` whose `error.context` is the `Response`. Read the code with `await error.context.json()`.
- Never query `profile_private` for anyone but yourself, and never query `match_meta`.

**Hooks**

| Hook | Returns |
| --- | --- |
| `useAuth()` | `{ session, user, loading }` from `AuthProvider` |
| `useProfile()` | `{ profile, loading, reload }` |
| `useSquad()` | `{ squad, loading, reload }` |
| `useChat(squadId)` | `{ messages, send, loading }`: loads history, subscribes, unsubscribes on unmount |

**Accessibility** (also for the Clio prize)

- [ ] Everything works with the keyboard alone, with a visible `focus-visible` ring
- [ ] Every input has a `<label>`. The tag picker uses real checkboxes or toggle buttons with `aria-pressed`
- [ ] Avatars have `alt` set to the display name. With no avatar, show initials
- [ ] Text contrast is at least 4.5:1
- [ ] Chat uses `role="log"` and `aria-live="polite"`

## Seed data

We seed about 40 real database users so the matching function has a pool to work with. The matching runs for real against real rows. The only thing that isn't real is that these people aren't humans, and we say so in the pitch.

**`scripts/seed-data.json`**: an array of `{ display_name, age, games, hobbies }`, using only slugs from `site/src/data/options.ts`. Build it in clusters so matches look sensible and a wildcard is genuinely different:

| Cluster | Count | Example games | Example hobbies |
| --- | --- | --- | --- |
| Competitive FPS | 8 | `valorant`, `cs2`, `apex-legends` | `gym`, `anime` |
| Cozy | 8 | `stardew-valley`, `animal-crossing`, `minecraft` | `baking`, `reading`, `gardening` |
| MOBA / strategy | 8 | `league-of-legends`, `dota-2`, `chess` | `music-production`, `poker` |
| Sandbox / co-op | 8 | `minecraft`, `terraria`, `lethal-company` | `hiking`, `drawing` |
| Mixed / wildcards | 8 | anything, spread thin | `rock-climbing`, `photography`, `cooking` |

Ages range from 18 to 45. No real people's names or photos: `avatar_url` stays `null`, and the frontend shows initials.

**`scripts/seed.mjs`** (Node, run locally with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in your shell):

1. For each entry, call `supabase.auth.admin.createUser({ email: 'seed+NN@internetcafe.test', email_confirm: true, user_metadata: { seed: true } })`. Don't set a password, so nobody can sign in as a seed.
2. Insert its `profiles` row with `is_seed: true`, then its `profile_private` row.
3. Skip any email that already exists, so the script can be run again safely.

**`scripts/reset-squads.mjs`** deletes every row in `squads`. The cascade clears `squad_members`, `match_meta` and `messages`. Run it before rehearsals and right before judging, so Jim's live onboarding gets a fresh squad.

The pool shrinks as squads form: 40 seeds give about 10 squads of 5. Run `reset-squads.mjs` if a judge testing the app hits `not_enough_people`.

## Build order and checkpoints

Contracts come first: both teams build against this doc from minute one, and the backend ships a stub so the frontend is never waiting. Features freeze at 8 AM Sunday. Everything after that is polish, the video and the submission.

| By | Backend | Frontend | Checkpoint (whole team) |
| --- | --- | --- | --- |
| Sat 5:30 PM | Supabase project, both migrations pushed, Google provider on | Vite + Tailwind + router skeleton, `backend-tools/` stubs, Landing with sign-in | Sign in with Google on localhost |
| Sat 6:30 PM | `form-squad` stub deployed, `options.ts` slugs agreed | Onboarding page saving to `profiles` + `profile_private` | A new user can finish onboarding |
| Sat 8:00 PM (mentors leave) | Seed script run, RLS checks pass, real `form-squad` deployed | FindSquad page calling `formSquad()`, deployed to Vercel | Sign-in works on the **deployed** URL. Ask mentors about anything still broken |
| Sat 11:00 PM | Fix bugs, `reset-squads.mjs` | Squad page + chat with realtime | Two real accounts chat live in one squad |
| Sun 8:00 AM | Feature freeze | Feature freeze, accessibility checklist | Full run-through as Jim on the deployed URL |
| Sun 10:30 AM | — | — | Devpost video (2–5 min) recorded and uploaded |
| Sun 11:00 AM | — | — | Submitted: "Team ID - Team Name - Project Name", GitHub link, video, AI disclosure from `docs/AI_USE.md` |
| Sun 11:30 AM | — | — | Hard deadline |

Merge to `main` often. Vercel deploys `main`, so a broken `main` means a broken demo.

## Open questions

- [ ] Minimum squad size: v1 allows 3. Is that OK, or do we wait until 5 people are available?
- [ ] Should seed users be reusable across squads, so the pool never runs out, instead of being used up?
- [ ] Do we want a few seeded welcome messages in each new squad for the demo, or keep chat strictly real?
- [ ] No-shows rule: what happens to an empty spot when a member never shows up?
- [ ] Scale and sustainability answer for Q&A: who pays, and what moderation costs.
- [ ] Hours bar and graduation are in "Later". Confirm they stay out of v1.
- [ ] Final app name (working name: Internet Cafe).
