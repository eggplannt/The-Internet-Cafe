// Posts one conversation starter as a "System" message in a squad's chat.
// Used right after the matcher forms a squad, and by post-starters for quiet squads.
// The pure logic (who to spotlight, the prompt, checking the reply) is in starters.ts.
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { callLLM } from './llm.ts';
import {
  buildPrompt, pickFromBank, pickSpotlight, STARTER_SYSTEM_PROMPT, validateStarter,
  type Starter, type StarterMember,
} from './starters.ts';

// What happened, for the "generate starter" button. fallbackReason says why the bank was
// used instead of the LLM. Neither field ever contains a hobby, a name or the LLM's reply.
export type StarterResult =
  | { ok: true; source: 'llm' | 'bank'; fallbackReason: string | null }
  | { ok: false; error: string };

// Never throws: a starter failing must never break matching or the cron run.
export async function postStarter(admin: SupabaseClient, squadId: string): Promise<StarterResult> {
  try {
    return await post(admin, squadId);
  } catch (e) {
    console.error(`postStarter(${squadId}) failed:`, e);
    // Database errors (e.g. a missing column) are safe to report and are what you need to debug
    return { ok: false, error: (e as { message?: string }).message ?? String(e) };
  }
}

async function post(admin: SupabaseClient, squadId: string): Promise<StarterResult> {
  const { data: squad, error: squadErr } = await admin
    .from('squads').select('common_games').eq('id', squadId).single();
  if (squadErr) throw squadErr;

  const { data: memberRows, error: membersErr } = await admin
    .from('squad_members').select('user_id').eq('squad_id', squadId);
  if (membersErr) throw membersErr;
  const ids = memberRows.map((m: { user_id: string }) => m.user_id);

  // Hobbies go to the LLM (numbered, unnamed). Names are only for rejecting a reply that contains one.
  const [{ data: interests, error: interestsErr }, { data: profiles, error: profilesErr }] = await Promise.all([
    admin.from('profile_private').select('user_id, hobbies').in('user_id', ids),
    admin.from('profiles').select('display_name').in('id', ids),
  ]);
  if (interestsErr) throw interestsErr;
  if (profilesErr) throw profilesErr;
  const members: StarterMember[] = interests.map((r: { user_id: string; hobbies: string[] }) => ({ id: r.user_id, hobbies: r.hobbies }));
  const memberNames = profiles.map((p: { display_name: string }) => p.display_name);

  const [{ data: past, error: pastErr }, { data: earlier, error: earlierErr }] = await Promise.all([
    admin.from('starter_spotlights').select('spotlight_user_id, hobby, created_at').eq('squad_id', squadId),
    admin.from('messages').select('body').eq('squad_id', squadId).eq('kind', 'system')
      .order('created_at', { ascending: false }),
  ]);
  if (pastErr) throw pastErr;
  if (earlierErr) throw earlierErr;
  const earlierTexts = earlier.map((m: { body: string }) => m.body); // newest first

  const spotlight = pickSpotlight(
    members,
    past.map((p: { spotlight_user_id: string | null; hobby: string | null; created_at: string }) =>
      ({ userId: p.spotlight_user_id, hobby: p.hobby, createdAt: p.created_at })),
  );

  // Try the LLM; on any problem (no key, HTTP error, 429, timeout, bad reply) use the bank
  let starter: Starter | null = null;
  let fallbackReason: string | null = null;
  if (!spotlight) fallbackReason = 'nobody in the squad has a hobby';
  else if (!Deno.env.get('GROQ_API_KEY')) fallbackReason = 'GROQ_API_KEY is not set';
  else {
    try {
      const raw = await callLLM(STARTER_SYSTEM_PROMPT, buildPrompt({
        commonGames: squad.common_games,
        members,
        spotlightHobby: spotlight.hobby,
        recentStarters: earlierTexts.slice(0, 5),
      }));
      const result = validateStarter(raw, { hobby: spotlight.hobby, memberNames });
      if (result.ok) starter = result.starter;
      else {
        console.warn(`starter rejected for ${squadId}: ${result.reason}`); // reason only, never the text
        fallbackReason = `LLM reply rejected: ${result.reason}`;
      }
    } catch (e) {
      console.warn(`LLM call failed for ${squadId}:`, e);
      // Only the status line ("groq 401: ...") or the timeout name, cut short
      fallbackReason = `LLM call failed: ${String((e as Error).message ?? e).slice(0, 200)}`;
    }
  }
  const source = starter ? 'llm' : 'bank';
  if (!starter) starter = pickFromBank(earlierTexts);

  // sender_id null + kind 'system': only the service role can insert this (see the starters migration)
  const { data: message, error: msgErr } = await admin
    .from('messages')
    .insert({
      squad_id: squadId,
      sender_id: null,
      kind: 'system',
      body: starter.text,
      meta: starter.answer ? { answer: starter.answer } : null,
    })
    .select('id')
    .single();
  if (msgErr) throw msgErr;

  // Server-only record of whose hobby this was, so the next starter spotlights someone else
  const { error: spotErr } = await admin.from('starter_spotlights').insert({
    squad_id: squadId,
    message_id: message.id,
    spotlight_user_id: spotlight?.userId ?? null,
    hobby: spotlight?.hobby ?? null,
    source,
  });
  if (spotErr) throw spotErr;
  return { ok: true, source, fallbackReason };
}
