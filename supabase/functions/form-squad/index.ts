import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { buildSquad, type Candidate } from '../_shared/matching.ts';

const MAX_RETRIES = 2;

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

  // Admin client for all DB writes (bypasses RLS)
  const admin = createClient(url, serviceKey);

  // If already in a squad, return it
  const { data: existing } = await admin
    .from('squad_members')
    .select('squad_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing) {
    return json({ squad_id: existing.squad_id, already_in_squad: true });
  }

  // Need a profile_private row to match
  const { data: callerPrivate } = await admin
    .from('profile_private')
    .select('games, hobbies')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!callerPrivate) {
    return json({ error: 'onboarding_incomplete' }, 400);
  }

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('created_at')
    .eq('id', user.id)
    .single();

  const caller: Candidate = {
    id: user.id,
    games: callerPrivate.games,
    hobbies: callerPrivate.hobbies,
    createdAt: callerProfile!.created_at,
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Load pool: everyone with private data who isn't in a squad yet, excluding caller
    const { data: poolRows, error: poolErr } = await admin
      .from('profile_private')
      .select('user_id, games, hobbies, profiles!inner(created_at)')
      .neq('user_id', user.id);
    // A failed read must not look like an empty pool (that would wrongly say not_enough_people)
    if (poolErr) return json({ error: 'internal' }, 500);

    const { data: memberRows, error: memberRowsErr } = await admin.from('squad_members').select('squad_id, user_id');
    if (memberRowsErr) return json({ error: 'internal' }, 500);

    // On a retry, someone else's squad may have grabbed the caller. If so, that's their squad now.
    const callerRow = memberRows.find((r: { user_id: string }) => r.user_id === user.id);
    if (callerRow) return json({ squad_id: callerRow.squad_id, already_in_squad: true });

    const inSquad = new Set(memberRows.map((r: { user_id: string }) => r.user_id));

    const pool: Candidate[] = (poolRows ?? [])
      .filter((r: { user_id: string }) => !inSquad.has(r.user_id))
      .map((r: { user_id: string; games: string[]; hobbies: string[]; profiles: { created_at: string } | { created_at: string }[] }) => ({
        id: r.user_id,
        games: r.games,
        hobbies: r.hobbies,
        createdAt: Array.isArray(r.profiles) ? r.profiles[0].created_at : r.profiles.created_at,
      }));

    const result = buildSquad(caller, pool);
    if (!result) {
      return json({ error: 'not_enough_people' }, 409);
    }
    const { picks, commonGames } = result;

    // Create the squad, storing the shared games every member plays
    const { data: squad, error: squadErr } = await admin
      .from('squads')
      .insert({ common_games: commonGames })
      .select('id')
      .single();
    if (squadErr) return json({ error: 'internal' }, 500);

    const squadId = squad.id;

    const { error: membersErr } = await admin.from('squad_members').insert(
      picks.map((p) => ({ squad_id: squadId, user_id: p.id }))
    );

    // 23505 = unique_violation: someone else grabbed a pool member first
    if (membersErr) {
      await admin.from('squads').delete().eq('id', squadId);
      if ((membersErr as { code?: string }).code === '23505' && attempt < MAX_RETRIES) continue;
      return json({ error: 'internal' }, 500);
    }

    const { error: metaErr } = await admin.from('match_meta').insert(
      picks.map((p) => ({ squad_id: squadId, user_id: p.id, score: p.score, is_wildcard: p.isWildcard }))
    );
    // Don't leave a squad without its match data. Deleting the squad cascades to its members.
    if (metaErr) {
      await admin.from('squads').delete().eq('id', squadId);
      return json({ error: 'internal' }, 500);
    }

    return json({ squad_id: squadId, already_in_squad: false });
  }

  return json({ error: 'internal' }, 500);
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
