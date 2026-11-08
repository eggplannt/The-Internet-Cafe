# AI Use Log

| Date | Who | What Claude Code did |
| --- | --- | --- |
| 2026-11-07 | Ajibola | Set up Supabase: `supabase init`, created both migration files (schema + RLS), `form-squad` Edge Function with matching logic, seed scripts, `.env.example`, `.gitignore`, and `vercel.json` |
| 2026-11-07 | Ajibola | Audited the repo against CLAUDE.md and docs/SPEC.md; renamed CLAUD.md → CLAUDE.md and spec.md → SPEC.md, switched the frontend key to VITE_SUPABASE_PUBLISHABLE_KEY (supabase.ts, CLAUDE.md, SPEC.md), added a root package.json so scripts/ can import supabase-js, verified table grants on the linked project |
| 2026-11-07 | Ajibola | Changed matching so every squad member, wildcard included, shares at least one game (non-empty `common_games`); updated `matching.ts` and SPEC.md (algorithm, code block, `common_games` wording); updated SPEC.md and CLAUDE.md paths to `site/src/`, TypeScript and `backend-tools/` |
| 2026-11-07 | Ajibola | Hardened `form-squad` (error checks on reads/inserts, re-checks caller membership on retry) and `seed.mjs` (`email_exists` check, deletes half-created users); added and pushed `20261107000003_grants.sql`; redeployed `form-squad`; seeded 40 users on the remote; ran an end-to-end test with a temporary account, then deleted it |
