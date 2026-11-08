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
export function useChat(squadId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const received = useRef(new Set<number>());

  useEffect(() => {
    // New squad — forget messages we already saw for the previous squad.
    received.current = new Set<number>();
    let mounted = true;

    async function loadHistory() {
      try {
        const history = await listMessages(squadId);
        if (!mounted) return;
        history.forEach((m) => received.current.add(m.id));
        setMessages(history);
      } catch (err) {
        if (!mounted) return;
        setError(
          err instanceof Error ? err.message : 'Failed to load messages.'
        );
      }
    }

    void loadHistory();

    const unsubscribe = subscribeToMessages(squadId, (message) => {
      if (!mounted) return;
      if (received.current.has(message.id)) return;
      received.current.add(message.id);
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [squadId]);

  const send = useCallback(
    async (body: string) => {
      setError(null);
      try {
        await sendMessage(squadId, body);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to send message.'
        );
      }
    },
    [squadId]
  );

  return { messages, send, error };
}
