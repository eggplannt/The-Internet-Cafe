import { supabase, currentUser } from './supabase';

export type JoinQueueResult =
  | { status: 'matched'; squad_id: string }
  | { status: 'waiting'; joined_at: string };

// Puts the user in the matchmaking queue and tries to match them straight away.
// Called once, when onboarding is submitted (and by a "Find my squad" button after leaving).
// Pages that only show the status use getQueueStatus()/getMySquad() instead.
// Safe to call again: it never resets your place in line.
// Throws with .code for known error states the UI can switch on.
export async function joinQueue(): Promise<JoinQueueResult> {
  const { data, error } = await supabase.functions.invoke('join-queue', { body: {} });

  if (error) {
    // supabase-js wraps non-2xx responses — read the actual error code from the body
    const body = await (error as { context?: Response }).context?.json().catch(() => null);
    const code = body?.error ?? 'internal';
    const err = new Error(code) as Error & { code: string };
    err.code = code;
    throw err;
  }

  return data as JoinQueueResult;
}

// Takes the user out of the queue. Doing nothing if they weren't in it is fine.
export async function leaveQueue(): Promise<void> {
  const user = await currentUser();
  if (!user) return;

  const { error } = await supabase.from('match_queue').delete().eq('user_id', user.id);
  if (error) throw error;
}

// Returns when the user joined the queue, or null if they aren't in it.
export async function getQueueStatus(): Promise<{ joined_at: string } | null> {
  const user = await currentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('match_queue')
    .select('joined_at')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Calls onMatched(squadId) the moment the matcher puts this user in a squad.
// Returns an unsubscribe function — call it on component unmount.
export function subscribeToMatch(userId: string, onMatched: (squadId: string) => void): () => void {
  const channel = supabase
    .channel(`match:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'squad_members', filter: `user_id=eq.${userId}` },
      (payload) => onMatched((payload.new as { squad_id: string }).squad_id),
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
