// Scheduled conversation starters. pg_cron calls this every 30 minutes (see the starters_cron
// migration). It posts a starter in squads that never got one, and in squads that have gone quiet.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { postStarter } from '../_shared/post-starter.ts';

// Keeps each run well under Groq's free-plan rate limit
const MAX_SQUADS_PER_RUN = 20;

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

Deno.serve(async (req) => {
  // Not a user endpoint: same shared secret as run-matcher, since pg_cron is the only caller.
  // verify_jwt is off for this function, so this check is the only gate.
  const secret = Deno.env.get('MATCHER_SECRET');
  if (!secret || req.headers.get('x-matcher-secret') !== secret) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    // Which squads are due is decided in SQL (public.starters_due), oldest last-starter first
    const { data, error } = await admin.rpc('starters_due', { max_squads: MAX_SQUADS_PER_RUN });
    if (error) throw error;
    const squadIds = (data as { squad_id: string }[]).map((r) => r.squad_id);

    // Answer right away and post in the background: each LLM call can take a few seconds,
    // and pg_net gives up waiting after 5. postStarter never throws.
    EdgeRuntime.waitUntil(Promise.all(squadIds.map((id) => postStarter(admin, id))));
    return new Response(JSON.stringify({ due: squadIds.length }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500 });
  }
});
