import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listMessages,
  sendMessage,
  subscribeToMessages,
} from '../backend-tools';
import type { Message } from '../backend-tools';

// Hook for live squad chat.
// Loads the last 200 messages on mount, then subscribes to Realtime inserts so
// new messages appear without a refresh.
// The sent message is never added locally — it arrives via the subscription,
// which keeps the database as the single source of truth.
// Messages are deduplicated by id in case an insert is delivered twice.
// If a live message arrives before listMessages resolves, it is merged back in
// instead of being overwritten by the history load.
// Returns { messages, send, error, loading }.
export function useChat(squadId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Ref that always mirrors the latest message array, so the history load can
  // merge in any live messages that arrived while it was pending.
  const messagesRef = useRef<Message[]>([]);
  const received = useRef(new Set<number>());

  // Show the loading state again when the squad changes. Done during render
  // (React's "adjust state when a prop changes" pattern) rather than inside
  // the effect, which would cost an extra render.
  const [loadingFor, setLoadingFor] = useState(squadId);
  if (loadingFor !== squadId) {
    setLoadingFor(squadId);
    setLoading(true);
  }

  useEffect(() => {
    // New squad — forget messages we already saw for the previous squad.
    received.current = new Set<number>();
    messagesRef.current = [];
    // Cleared on unmount / squad change so late responses don't set state.
    let mounted = true;

    async function loadHistory() {
      try {
        const history = await listMessages(squadId);
        // Merge: keep any live messages not already in history, then sort by id.
        const historyIds = new Set(history.map((m) => m.id));
        const live = messagesRef.current.filter((m) => !historyIds.has(m.id));
        const merged = [...history, ...live].sort((a, b) => a.id - b.id);
        messagesRef.current = merged;
        history.forEach((m) => received.current.add(m.id));
        live.forEach((m) => received.current.add(m.id));
        if (!mounted) return;
        setMessages(merged);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load messages.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadHistory();

    const unsubscribe = subscribeToMessages(squadId, (message) => {
      if (!mounted) return;
      if (received.current.has(message.id)) return;
      received.current.add(message.id);
      const next = messagesRef.current.filter((m) => m.id !== message.id);
      next.push(message);
      messagesRef.current = next;
      setMessages((prev) => {
        // Avoid adding a message already present (e.g. just merged from history).
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [squadId]);

  const send = useCallback(
    async (body: string, replyTo?: number | null): Promise<boolean> => {
      setError(null);
      try {
        await sendMessage(squadId, body, replyTo);
        return true;
      } catch (err) {
        console.warn('send message failed:', err);
        const code = (err as { code?: string }).code;
        if (code === 'invalid') {
          setError('messages need 1 to 2000 characters.');
        } else {
          setError("couldn't send that. try again.");
        }
        return false;
      }
    },
    [squadId]
  );

  return { messages, send, error, loading };
}
