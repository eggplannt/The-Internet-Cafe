// Called by the browser when a user clicks "Find my squad", and again whenever the
// waiting page opens (which also tells us they're still around).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { runMatcher } from '../_shared/matcher.ts';

Deno.serve(async (req) => {
  // Answer CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Verify the caller is signed in using their token
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return json({ error: 'not_signed_in' }, 401);
  }

  // Admin client for everything else (bypasses RLS)
  const admin = createClient(url, serviceKey);

  try {
    // Already matched? Then there's nothing to queue for.
    const existing = await findSquad(admin, user.id);
    if (existing) return json({ status: 'matched', squad_id: existing });

    // Need interests to match on
    const { data: interests, error: interestsErr } = await admin
      .from('profile_private').select('user_id').eq('user_id', user.id).maybeSingle();
    if (interestsErr) throw interestsErr;
    if (!interests) return json({ error: 'onboarding_incomplete' }, 400);

    // Join the queue, or refresh last_seen_at if already in it. joined_at is left out
    // so a repeat call never resets someone's place in line.
    const { error: queueErr } = await admin
      .from('match_queue')
      .upsert({ user_id: user.id, last_seen_at: new Date().toISOString() });
    if (queueErr) throw queueErr;

    // Try to match right away rather than waiting for the next scheduled pass
    await runMatcher(admin);

    const squadId = await findSquad(admin, user.id);
    if (squadId) return json({ status: 'matched', squad_id: squadId });

    const { data: row, error: rowErr } = await admin
      .from('match_queue').select('joined_at').eq('user_id', user.id).single();
    if (rowErr) throw rowErr;
    return json({ status: 'waiting', joined_at: row.joined_at });
  } catch (e) {
    console.error(e);
    return json({ error: 'internal' }, 500);
  }
});

async function findSquad(admin: ReturnType<typeof createClient>, userId: string): Promise<string | null> {
  const { data, error } = await admin
    .from('squad_members').select('squad_id').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data?.squad_id ?? null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
