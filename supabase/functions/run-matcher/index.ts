// Scheduled matching pass. pg_cron calls this every 5 minutes (see the matcher_cron migration),
// so people who joined the queue get matched when new people arrive or their wait relaxes the rules.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { runMatcher } from '../_shared/matcher.ts';

Deno.serve(async (req) => {
  // Not a user endpoint: only callers holding the shared secret (pg_cron) may run it.
  // verify_jwt is off for this function, so this check is the only gate.
  const secret = Deno.env.get('MATCHER_SECRET');
  if (!secret || req.headers.get('x-matcher-secret') !== secret) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    const formed = await runMatcher(admin);
    return new Response(JSON.stringify({ formed }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500 });
  }
});
