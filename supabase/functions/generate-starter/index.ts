// Called by the browser when a squad member clicks "generate starter".
// Posts one conversation starter in that squad now, and says whether it came from
// the LLM or the bank (and why), which also makes it a handy way to debug starters.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { postStarter } from '../_shared/post-starter.ts';

// One starter per squad per minute, so a button can't flood the chat or burn Groq's rate limit
const COOLDOWN_MS = 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: 'not_signed_in' }, 401);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    const { squad_id: squadId } = await req.json().catch(() => ({}));
    if (typeof squadId !== 'string') return json({ error: 'invalid' }, 400);

    // Only members can ask for a starter in their squad
    const { data: member, error: memberErr } = await admin
      .from('squad_members').select('user_id').eq('squad_id', squadId).eq('user_id', user.id).maybeSingle();
    if (memberErr) throw memberErr;
    if (!member) return json({ error: 'not_member' }, 403);

    const { data: last, error: lastErr } = await admin
      .from('messages').select('created_at').eq('squad_id', squadId).eq('kind', 'system')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (lastErr) throw lastErr;
    if (last && Date.now() - new Date(last.created_at).getTime() < COOLDOWN_MS) {
      return json({ error: 'too_soon' }, 429);
    }

    const result = await postStarter(admin, squadId);
    if (!result.ok) return json({ error: 'internal', detail: result.error }, 500);
    // The message itself arrives in the chat over Realtime, like every other message
    return json({ source: result.source, fallback_reason: result.fallbackReason });
  } catch (e) {
    console.error(e);
    return json({ error: 'internal', detail: (e as { message?: string }).message ?? String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
