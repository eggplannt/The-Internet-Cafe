import { useEffect, useState } from 'react';
import { getMyProfile, getMySquad, joinQueue, nextRoute, subscribeToMatch } from '../backend-tools';

export type AutoJoinState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'needs_onboarding' }
  | { status: 'waiting'; joined_at: string }
  | { status: 'matched'; squad_id: string | null }
  | { status: 'error'; code: string };

// Starts matchmaking as soon as a signed-in, onboarded user opens the app,
// so they never have to click "Find my squad".
//
// Matchmaking is a waiting list, so joining can end in "matched" right away
// or "waiting". While waiting, we listen over Realtime and flip to "matched"
// the moment the matcher puts this user in a squad.
//
// Calling joinQueue() more than once is safe (it keeps your place in line),
// which is also why React StrictMode's double mount in dev is harmless here.
export function useAutoJoinQueue(): AutoJoinState {
  const [state, setState] = useState<AutoJoinState>({ status: 'loading' });

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    async function run() {
      try {
        // nextRoute() waits for supabase-js to finish reading the Google
        // redirect, so this works on the first load after sign-in.
        const route = await nextRoute();
        if (!mounted) return;

        if (route === '/') return setState({ status: 'signed_out' });
        if (route === '/onboarding') return setState({ status: 'needs_onboarding' });
        if (route === '/squad') return setState({ status: 'matched', squad_id: null });

        // '/find' (not queued yet) or '/waiting' (already queued): join either way.
        // For someone already waiting this refreshes "still around" and tries a match now.
        const result = await joinQueue();
        if (!mounted) return;

        if (result.status === 'matched') {
          return setState({ status: 'matched', squad_id: result.squad_id });
        }
        setState({ status: 'waiting', joined_at: result.joined_at });

        // Hear about the match live instead of polling.
        const profile = await getMyProfile();
        if (!mounted || !profile) return;
        unsubscribe = subscribeToMatch(profile.id, (squadId) => {
          if (mounted) setState({ status: 'matched', squad_id: squadId });
        });

        // A squad could have formed between joinQueue() and subscribing, so check once.
        const squad = await getMySquad();
        if (mounted && squad) setState({ status: 'matched', squad_id: squad.squad_id });
      } catch (err) {
        if (!mounted) return;
        const code = (err as { code?: string }).code ?? 'internal';
        // A profile with no saved games/hobbies (a half-finished onboarding)
        // gets this from the server. Send them back to onboarding.
        if (code === 'onboarding_incomplete') return setState({ status: 'needs_onboarding' });
        setState({ status: 'error', code });
      }
    }

    void run();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  return state;
}
