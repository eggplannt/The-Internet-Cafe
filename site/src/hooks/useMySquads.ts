import { useEffect, useState } from 'react';
import { getMySquads, subscribeToMatch, type Squad } from '../backend-tools';
import { useAuth } from './useAuth.tsx';

// Every squad the signed-in user is in. `squads` is null while loading.
// Reloads by itself when the matcher adds the user to a new squad.
export function useMySquads(): { squads: Squad[] | null; error: boolean } {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  // Tagged with whose list it is, so switching accounts never shows the old one
  const [result, setResult] = useState<{ userId: string; squads: Squad[] | null; error: boolean } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    const load = () =>
      getMySquads()
        .then((squads) => { if (mounted) setResult({ userId, squads, error: false }); })
        .catch(() => { if (mounted) setResult({ userId, squads: null, error: true }); });

    void load();
    // A new squad_members row for me means a new squad: fetch the list again
    const unsubscribe = subscribeToMatch(userId, () => { void load(); });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [userId]);

  if (!userId) return { squads: [], error: false };
  return result?.userId === userId ? { squads: result.squads, error: result.error } : { squads: null, error: false };
}
