import { useEffect, useRef, useState } from 'react';
import { listMessages, subscribeToMessages } from '../backend-tools';

// When this browser last looked at each squad's chat. Kept in localStorage: it's only a
// per-device convenience for the unread dots, so it doesn't need a database table.
// Every access is wrapped because storage can be blocked (e.g. private windows).
const seenKey = (squadId: string) => `squad-seen:${squadId}`;

function lastSeen(squadId: string): string | null {
  try {
    return localStorage.getItem(seenKey(squadId));
  } catch {
    return null;
  }
}

function markSquadSeen(squadId: string): void {
  try {
    localStorage.setItem(seenKey(squadId), new Date().toISOString());
  } catch {
    // Storage blocked: the dot just keeps showing, nothing breaks
  }
}

// Which of these squads have something the user hasn't checked yet: a squad never opened
// on this device, or a message from someone else since they last looked.
// `openSquadId` is the chat on screen right now: it counts as checked, and stays checked
// as new messages arrive in it.
export function useUnreadSquads(squadIds: string[], myId: string | null, openSquadId: string | null = null): Set<string> {
  // Newest message from someone else, per squad. Compared with lastSeen() on every render.
  const [latest, setLatest] = useState<Record<string, string>>({});

  // The subscriptions below are long-lived, so they read the open squad from a ref
  const openRef = useRef(openSquadId);
  useEffect(() => {
    openRef.current = openSquadId;
    if (!openSquadId) return;
    markSquadSeen(openSquadId);
    // Mark it once more when the user switches away, so it doesn't light up behind them
    return () => markSquadSeen(openSquadId);
  }, [openSquadId]);

  // Re-run only when the list of squads actually changes, not on every new array
  const idsKey = squadIds.join(',');
  useEffect(() => {
    if (!myId || !idsKey) return;
    let mounted = true;
    const ids = idsKey.split(',');
    const bump = (squadId: string, at: string) =>
      setLatest((prev) => (prev[squadId] && prev[squadId] >= at ? prev : { ...prev, [squadId]: at }));

    const unsubscribes = ids.map((squadId) => {
      listMessages(squadId)
        .then((messages) => {
          const fromOthers = messages.filter((m) => m.sender_id !== myId);
          const newest = fromOthers[fromOthers.length - 1]; // oldest first, so last is newest
          if (mounted && newest) bump(squadId, newest.created_at);
        })
        .catch(() => { /* the dot is a nice-to-have; leave it off on errors */ });

      return subscribeToMessages(squadId, (m) => {
        if (!mounted || m.sender_id === myId) return;
        // Arrived while they're reading it: it's seen, not new
        if (openRef.current === squadId) markSquadSeen(squadId);
        else bump(squadId, m.created_at);
      });
    });

    return () => {
      mounted = false;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [idsKey, myId]);

  return new Set(
    squadIds.filter((id) => {
      if (id === openSquadId) return false;
      const seen = lastSeen(id);
      return seen === null || (latest[id] !== undefined && latest[id] > seen);
    }),
  );
}
