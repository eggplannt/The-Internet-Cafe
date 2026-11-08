import { useEffect, useState } from 'react';
import { getMyProfile, getMySquad, getQueueStatus, subscribeToMatch } from '../backend-tools';
import { useAuth } from './useAuth.tsx';

export type MatchStatus =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'needs_onboarding' }
  | { status: 'not_queued' }
  | { status: 'waiting'; joined_at: string }
  | { status: 'matched'; squad_id: string }
  | { status: 'error'; code: string };

// Reports where the signed-in user is in matchmaking. It only reads, it never joins:
// joining happens once, when onboarding is submitted. After that, finding a squad can
// take seconds or days, and the matcher does it in the background (on every join and every
// 5 minutes), so a page load just needs to look up the current state and listen for the match.
export function useMatchStatus(): MatchStatus {
  // Whether we're signed in comes from AuthProvider, which already knows, so we don't ask the server
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;

  // The latest answer, tagged with whose it is, so switching accounts never shows the old one
  const [result, setResult] = useState<{ userId: string; state: MatchStatus } | null>(null);

  useEffect(() => {
    if (!userId) return;

    let mounted = true;
    const setState = (state: MatchStatus) => setResult({ userId, state });
    let unsubscribe: (() => void) | null = null;

    async function run(userId: string) {
      try {
        // Three plain reads of the user's own rows (RLS allows these), done in parallel
        const [profile, squad, queued] = await Promise.all([getMyProfile(), getMySquad(), getQueueStatus()]);
        if (!mounted) return;

        if (!profile) return setState({ status: 'needs_onboarding' });
        if (squad) return setState({ status: 'matched', squad_id: squad.squad_id });
        // Not in a squad or the queue, e.g. they left the queue
        if (!queued) return setState({ status: 'not_queued' });
        setState({ status: 'waiting', joined_at: queued.joined_at });

        // Hear about the match live instead of polling.
        unsubscribe = subscribeToMatch(userId, (squadId) => {
          if (mounted) setState({ status: 'matched', squad_id: squadId });
        });

        // A squad could have formed between the reads above and subscribing, so check once.
        const latest = await getMySquad();
        if (mounted && latest) setState({ status: 'matched', squad_id: latest.squad_id });
      } catch (err) {
        if (!mounted) return;
        setState({ status: 'error', code: (err as { code?: string }).code ?? 'internal' });
      }
    }

    void run(userId);

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [userId]);

  if (loading) return { status: 'loading' };
  if (!userId) return { status: 'signed_out' };
  return result?.userId === userId ? result.state : { status: 'loading' };
}
