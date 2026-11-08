// Runs one matching pass over the queue. Used by join-queue (right after someone joins)
// and by run-matcher (every few minutes, from pg_cron).
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { buildSquad, minOthersFor, type Candidate } from './matching.ts';
import { postStarter } from './post-starter.ts';

// Supabase's runtime global: keeps the function alive for background work after it responds
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

// Queue rows not refreshed for this long are dropped, so nobody is matched with someone who left.
const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

type QueueRow = { user_id: string; joined_at: string };
type InterestRow = {
  user_id: string; games: string[]; hobbies: string[];
  profiles: { created_at: string; is_seed: boolean } | { created_at: string; is_seed: boolean }[];
};

// Returns how many squads were formed. Throws on database errors.
export async function runMatcher(admin: SupabaseClient): Promise<number> {
  const staleBefore = new Date(Date.now() - STALE_AFTER_MS).toISOString();
  const { error: staleErr } = await admin.from('match_queue').delete().lt('last_seen_at', staleBefore);
  if (staleErr) throw staleErr;

  // Waiting real users, longest wait first. Seeds have no queue rows: they're always available.
  const { data: queue, error: queueErr } = await admin
    .from('match_queue').select('user_id, joined_at').order('joined_at', { ascending: true });
  if (queueErr) throw queueErr;
  if (queue.length === 0) return 0;

  const { data: rows, error: rowsErr } = await admin
    .from('profile_private')
    .select('user_id, games, hobbies, profiles!inner(created_at, is_seed)');
  if (rowsErr) throw rowsErr;

  const { data: members, error: membersErr } = await admin.from('squad_members').select('user_id');
  if (membersErr) throw membersErr;
  const inSquad = new Set(members.map((m: { user_id: string }) => m.user_id));
  const queued = new Set(queue.map((q: QueueRow) => q.user_id));

  // Everyone who could be picked: queued real users plus every seed not already in a squad
  const available = new Map<string, Candidate>();
  for (const r of rows as InterestRow[]) {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    if (inSquad.has(r.user_id) || !(p.is_seed || queued.has(r.user_id))) continue;
    available.set(r.user_id, { id: r.user_id, games: r.games, hobbies: r.hobbies, createdAt: p.created_at, isSeed: p.is_seed });
  }

  let formed = 0;
  for (const q of queue as QueueRow[]) {
    const anchor = available.get(q.user_id);
    if (!anchor) continue; // already placed this pass, or never finished onboarding

    const pool = [...available.values()].filter((c) => c.id !== anchor.id);
    const waited = Date.now() - new Date(q.joined_at).getTime();
    const result = buildSquad(anchor, pool, minOthersFor(waited));
    if (!result) continue; // keeps waiting; the next pass may find more people

    const { data: squad, error: squadErr } = await admin
      .from('squads').insert({ common_games: result.commonGames }).select('id').single();
    if (squadErr) throw squadErr;

    // One insert for all members, so the one-squad-per-user index rejects the whole
    // squad if a parallel pass already grabbed someone.
    const { error: insertErr } = await admin.from('squad_members').insert(
      result.picks.map((p) => ({ squad_id: squad.id, user_id: p.id })),
    );
    if (insertErr) {
      await admin.from('squads').delete().eq('id', squad.id);
      // 23505 = unique_violation: another pass got there first. Our data is stale, so stop;
      // anyone still waiting is picked up on the next pass.
      if ((insertErr as { code?: string }).code === '23505') return formed;
      throw insertErr;
    }

    const { error: metaErr } = await admin.from('match_meta').insert(
      result.picks.map((p) => ({ squad_id: squad.id, user_id: p.id, score: p.score, is_wildcard: p.isWildcard })),
    );
    if (metaErr) {
      await admin.from('squads').delete().eq('id', squad.id); // cascades to members
      throw metaErr;
    }

    // Matched people leave the queue and the pool. If this delete fails it's harmless:
    // they're in squad_members now, which every route and pass checks first.
    const ids = result.picks.map((p) => p.id);
    await admin.from('match_queue').delete().in('user_id', ids);
    ids.forEach((id) => available.delete(id));
    formed++;

    // First conversation starter, in the background so it never slows the matcher's response.
    // If it fails, post-starters retries it on its next run.
    EdgeRuntime.waitUntil(postStarter(admin, squad.id));
  }
  return formed;
}
