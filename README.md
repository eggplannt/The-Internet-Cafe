# The Internet Cafe

For gamers with other hobbies. Sign in, tell us what you play and what you do when you're not playing, and we put you in a small squad of people who share a game with you and have similar hobbies, plus one "wildcard" who's a bit different. Then you chat.

The twist: **nobody ever sees anyone else's hobbies.** Matching happens on the server, and the only thing a squad sees in common is its shared game(s). To help people find what they have in common, the cafe posts conversation starters in the chat: questions anyone can answer, which quietly give one member's hobby an opening, without saying whose.

- **Full technical spec:** [`docs/SPEC.md`](docs/SPEC.md)
- **AI use disclosure:** [`docs/AI_USE.md`](docs/AI_USE.md). Claude Code helped write this code. Inside the product, conversation starters are written by `openai/gpt-oss-120b` on Groq, which only ever sees numbered members' hobbies and the shared games, never names or ids.

## Run it locally (about 2 minutes)

You need **Node.js 22+**. The frontend talks to our hosted Supabase project, so there's no backend to set up.

```sh
git clone https://github.com/eggplannt/The-Internet-Cafe.git
cd The-Internet-Cafe/site
npm install
npm run dev
```

Open http://localhost:5173 and click **login/signup with google**.

`site/.env.local` is committed on purpose. It holds only the project URL and Supabase's *publishable* key, which is public by design (it ships in every browser bundle anyway). Row-level security in the database decides what each user can read or write. No secret keys are in this repo.

To check the production build: `npm run build` (in `site/`).

## Try it end to end

Matching needs **two real people** in the same squad (the other members are ~40 seeded users, who never reply), so use two Google accounts, e.g. one normal window and one private window, or two devices.

1. **Account A:** sign in, fill in the profile (name, age 18+, a cup avatar, at least one game and one hobby). Submitting puts you in the matchmaking queue, and the home page says *"looking for your squad…"*.
2. **Account B:** do the same, picking **at least one game in common** with A (e.g. both pick Minecraft).
3. When B joins, the matcher forms a squad of up to 5 around you. A's page hears it live. Open **chat rooms** on both.
4. You'll see members' names and avatars and the squad's shared game, but nobody's hobbies. The chat opens with a **Cafe** conversation starter.
5. Send messages from both accounts: they appear live on the other side, with times.
6. Click **generate starter** for a new starter (once a minute per squad). The line next to it says whether it came from the LLM or the backup list, and why.

If a squad doesn't form, the queue keeps you waiting until a compatible second person joins, and a scheduled pass re-checks every 5 minutes. Each account can be in one squad.

## Run the tests

Starter logic (spotlight choice, prompt building, rejecting starters that name a hobby or a member) has unit tests. They need [Deno](https://deno.com):

```sh
npm run test:starters    # from the repo root
```

Lint and type-check the frontend from `site/`: `npm run lint` and `npx tsc -p tsconfig.app.json --noEmit`.

## How it's built

| Part | What |
| --- | --- |
| Frontend (`site/`) | React + Vite + TypeScript + Tailwind, deployed on Vercel. Pages only talk to Supabase through `site/src/backend-tools/` |
| Database (`supabase/migrations/`) | Supabase Postgres with row-level security on every table. Hobbies live in `profile_private` (only you can read yours). Match scores, wildcard flags and starter spotlights live in server-only tables no client can read |
| Server (`supabase/functions/`) | Deno Edge Functions: `join-queue` (join and match now), `run-matcher` (every 5 min), `post-starters` (every 30 min), `generate-starter` (the chat button) |
| Matching (`supabase/functions/_shared/matching.ts`) | Pure functions: everyone must share a game; hobbies are scored with Jaccard similarity; 1 wildcard per squad |
| Chat | A `messages` table streamed over Supabase Realtime |
| Starters (`supabase/functions/_shared/starters.ts`) | Pure functions plus one Groq call; if Groq is down or says something we reject, a hand-written backup list is used |

## Running your own backend (optional)

Only needed if you want your own Supabase project instead of ours. See **Setup** in [`docs/SPEC.md`](docs/SPEC.md): create a project, link it, then from the repo root:

```sh
npm install
npm run deploy           # db push --linked, then deploy all Edge Functions
npx supabase secrets set MATCHER_SECRET=<random> GROQ_API_KEY=<key>
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
```

and point `site/.env.local` at your project's URL and publishable key.
