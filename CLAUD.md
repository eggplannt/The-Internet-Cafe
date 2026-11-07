# Internet Cafe

Spec: docs/SPEC.md. Read it before any change.

- Frontend work lives in src/. Backend work lives in supabase/ and scripts/.
- Contracts: table names, columns, RLS, the form-squad request/response, and the function list in src/lib/api.js.
- Don't change a contract without updating docs/SPEC.md and telling the other team.
- Never use the service-role key in src/. The browser only uses VITE_SUPABASE_ANON_KEY.
- Never show users other people's games or hobbies, match scores, or who the wildcard is.
- Out of scope for v1: twin hunt, rewards, co-op game, presence, hours bar, graduation. Don't build them.
- No new npm packages without asking.
- Write plain, readable code with short comments on the why. Every teammate must be able to explain every file to judges.
- After each session, add a line to docs/AI_USE.md: date, who, what Claude Code did.
