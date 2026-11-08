# Internet Cafe

Spec: docs/SPEC.md. Read it before any change.

- Frontend work lives in site/src/. Backend work lives in supabase/ and scripts/.
- Contracts: table names, columns, RLS, the join-queue request/response, and the function list in site/src/backend-tools/.
- Don't change a contract without updating docs/SPEC.md and telling the other team.
- Never use the service-role key in site/src/. The browser only uses VITE_SUPABASE_PUBLISHABLE_KEY.
- Never show users other people's games or hobbies, match scores, or who the wildcard is. The one exception is the squad's common game(s), which every member sees.
- Out of scope for v1: twin hunt, rewards, co-op game, presence, hours bar, graduation. Don't build them.
- No new npm packages without asking.
- Write plain, readable code with short comments on the why. Every teammate must be able to explain every file to judges.
- After each session, add a line to docs/AI_USE.md: date, who, what Claude Code did.
