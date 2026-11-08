import { useEffect, useRef, useState } from 'react';
import { useChat } from '../hooks/useChat';
import type { SquadMember } from '../backend-tools';

interface ChatPanelProps {
  squadId: string;
  myId: string;
  members: SquadMember[];
}

// Crude squad chat UI. Only the sender's display_name is shown — never games,
// hobbies, match scores, or who the wildcard is.
export default function ChatPanel({
  squadId,
  myId,
  members,
}: ChatPanelProps) {
  const { messages, send, error } = useChat(squadId);
  const listRef = useRef<HTMLDivElement>(null);
  const [body, setBody] = useState('');

  // Look the sender's name up from the squad member list passed in by the page.
  const displayName = (id: string) => {
    const member = members.find((m) => m.id === id);
    return member?.display_name ?? 'Someone';
  };

  // Scroll to the bottom whenever a new message arrives.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!body.trim()) return;
    void send(body);
    setBody('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!body.trim()) return;
      void send(body);
      setBody('');
    }
    // Shift+Enter: default textarea behaviour inserts a newline.
  };

  return (
    <section className="flex flex-col h-full bg-navy text-white">
      <div
        ref={listRef}
        className="flex-1 scrollbar-thumb-pink-500 overflow-y-auto p-4 space-y-3"
        role="log"
        aria-live="polite"
      >
        {messages.map((m) => {
          // Conversation starters from the app: centered card, no sender to look up
          if (m.kind === 'system' || m.sender_id === null) {
            return (
              <div key={m.id} className="flex justify-center">
                <div className="w-full max-w-[90%] rounded-lg border-2 border-pink/70 bg-white/5 px-4 py-3 text-center">
                  <p className="mb-1 text-xs uppercase tracking-wider text-white/70">System</p>
                  <p className="text-xl">{m.body}</p>
                  {m.meta?.answer && (
                    <details className="mt-2 text-lg">
                      <summary className="cursor-pointer rounded text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink">
                        Reveal answer
                      </summary>
                      <p className="mt-1">{m.meta.answer}</p>
                    </details>
                  )}
                </div>
              </div>
            );
          }

          const mine = m.sender_id === myId;
          return (
            <div
              key={m.id}
              className={mine ? 'flex justify-end' : 'flex justify-start'}
            >
              <div
                className={
                  mine
                    ? 'bg-pink text-white rounded-lg px-3 py-2 max-w-[80%]'
                    : 'bg-white/10 rounded-lg px-3 py-2 max-w-[80%]'
                }
              >
                {!mine && (
                  <p className="text-xs text-white/60 mb-1">
                    {displayName(m.sender_id)}
                  </p>
                )}
                <p className="text-xl">{m.body}</p>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={handleSubmit} className="p-4">
        {error && <p className="mb-2 text-pink">{error}</p>}
        <div className="flex gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="flex-1 resize-none bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xl text-white focus:outline-none focus:ring-2 focus:ring-pink"
            placeholder="Type a message, and get to know your new frends..."
          ></textarea>
          <button
            type="submit"
            disabled={!body.trim()}
            className="rounded-lg bg-pink px-6 py-2 text-xl text-white transition hover:scale-105 disabled:opacity-50"
          >
            send
          </button>
        </div>
      </form>
    </section>
  );
}
