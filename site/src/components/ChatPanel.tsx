import { useEffect, useRef, useState } from 'react';
import { useChat } from '../hooks/useChat';
import { generateStarter } from '../backend-tools';
import type { Message, SquadMember } from '../backend-tools';
import ChatMessage from './ChatMessage.tsx';

interface ChatPanelProps {
  squadId: string;
  myId: string;
  members: SquadMember[];
  game?: string;
}

// Label for a day divider: "Today", "Yesterday", or "Nov 7".
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// True when the scroll container is within `threshold` px of the bottom.
function isNearBottom(element: HTMLElement | null, threshold = 80): boolean {
  if (!element) return true;
  return (
    element.scrollHeight - element.scrollTop - element.clientHeight <=
    threshold
  );
}

// Crude squad chat UI. Only the sender's display_name is shown — never games,
// hobbies, match scores, or who the wildcard is.
export default function ChatPanel({
  squadId,
  myId,
  members,
  game,
}: ChatPanelProps) {
  const { messages, send, error, loading } = useChat(squadId);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState('');
  const [generating, setGenerating] = useState(false);
  // What the last "generate starter" click did.
  const [starterNote, setStarterNote] = useState<string | null>(null);
  // Whether a new message arrived while the user was scrolled up.
  const [newMessages, setNewMessages] = useState(false);
  // Was the user near the bottom when the last message arrived?
  const atBottomRef = useRef(true);
  const lastMessageIdRef = useRef<number | null>(null);
  // The message the composer is replying to, if any.
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  // Message briefly ringed after jumping to it from a reply's quote.
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const highlightTimerRef = useRef<number | undefined>(undefined);

  // ChatPanel is remounted per squad (key in squad.tsx), which already clears
  // the reply. This guard also covers being reused for another squad.
  const replyTarget =
    replyingTo && replyingTo.squad_id === squadId ? replyingTo : null;

  // Don't fire a pending highlight timeout after the panel is gone.
  useEffect(() => {
    return () => window.clearTimeout(highlightTimerRef.current);
  }, []);

  // Track scroll position so we know whether to auto-scroll on new messages.
  const handleScroll = () => {
    const near = isNearBottom(listRef.current, 80);
    if (near !== atBottomRef.current) {
      atBottomRef.current = near;
      if (near) setNewMessages(false);
    }
  };

  // Auto-scroll only if the user was near the bottom, or the new message is
  // their own. Otherwise show a "new messages" button. Instant scroll, no
  // animation.
  useEffect(() => {
    const list = listRef.current;
    if (!list || messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    const isMine = lastMsg.sender_id === myId;
    const isNew = lastMessageIdRef.current !== lastMsg.id;
    lastMessageIdRef.current = lastMsg.id;

    if (!isNew) return;

    if (atBottomRef.current || isMine) {
      list.scrollTop = list.scrollHeight;
      setNewMessages(false);
    } else {
      setNewMessages(true);
    }
  }, [messages, myId]);

  const scrollToBottom = () => {
    const list = listRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
      atBottomRef.current = true;
      setNewMessages(false);
    }
  };

  // Put text into the composer and focus it. Used by "play tonight?", which
  // doesn't send the message.
  const insertText = (text: string) => {
    setBody(text);
    textareaRef.current?.focus();
  };

  // "reply" on a message or "answer this" on a riddle: quote it in the
  // composer. Keeps whatever is already typed.
  const startReply = (message: Message) => {
    setReplyingTo(message);
    textareaRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
    textareaRef.current?.focus();
  };

  // Display name for a message's sender, used in quotes and the reply bar.
  const nameFor = (message: Message): string => {
    if (message.kind === 'system' || message.sender_id === null) return 'Cafe';
    if (message.sender_id === myId) return 'you';
    return (
      members.find((mm) => mm.id === message.sender_id)?.display_name ??
      'someone'
    );
  };

  // Scroll the quoted original to the middle of the message list and ring it
  // for 1.5s. Scrolls the list itself (not scrollIntoView) so the whole page
  // doesn't jump; offsetTop is relative to the list because it's `relative`.
  const jumpTo = (id: number) => {
    const list = listRef.current;
    const target = document.getElementById(`msg-${id}`);
    if (!list || !target) return;
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    list.scrollTo({
      top: target.offsetTop - (list.clientHeight - target.offsetHeight) / 2,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
    setHighlightedId(id);
    window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(
      () => setHighlightedId(null),
      1500
    );
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setStarterNote(null);
    try {
      await generateStarter(squadId);
      // Always just "starter posted." on success — never show fallback_reason.
      setStarterNote('starter posted.');
    } catch (err) {
      console.warn('generate starter failed:', err);
      const code = (err as { code?: string }).code;
      setStarterNote(
        code === 'too_soon'
          ? 'a starter was just posted. try again in a minute.'
          : "couldn't post a starter. try again in a minute."
      );
    } finally {
      setGenerating(false);
    }
  };

  // Single submit path used by both the form and the Enter key. Clears the
  // composer (text and reply) only when the send actually succeeds.
  const handleSend = async () => {
    if (!body.trim()) return;
    const ok = await send(body, replyTarget?.id ?? null);
    if (ok) {
      setBody('');
      setReplyingTo(null);
    }
  };

  // Look up reply originals by id without searching the array per message.
  const byId = new Map(messages.map((m) => [m.id, m]));

  // A new day gets a divider above its first message.
  const startsNewDay = (index: number): boolean =>
    index === 0 ||
    new Date(messages[index].created_at).toDateString() !==
      new Date(messages[index - 1].created_at).toDateString();

  // Whether message `index` continues the previous message's group: same
  // sender, under 5 minutes later, and no day divider in between. Starter
  // cards (no sender) always break a group, before and after.
  const continuesGroup = (index: number): boolean => {
    if (index === 0 || startsNewDay(index)) return false;
    const m = messages[index];
    const prev = messages[index - 1];
    if (m.sender_id === null || m.kind === 'system') return false;
    if (prev.sender_id === null || prev.kind === 'system') return false;
    if (m.sender_id !== prev.sender_id) return false;
    const gap =
      new Date(m.created_at).getTime() - new Date(prev.created_at).getTime();
    return gap < 5 * 60 * 1000;
  };

  return (
    <section className="flex flex-col h-full bg-navy/80 text-white">
      {/* Thin pink scrollbar on a transparent track to match the dark theme.
          `relative` makes this the containing block for the absolutely
          positioned sr-only text inside messages, so it's clipped here instead
          of stretching the whole page's scroll height. */}
      <div
        ref={listRef}
        className="relative flex flex-1 flex-col overflow-y-auto p-4 [scrollbar-width:thin] [scrollbar-color:var(--color-pink)_transparent]"
        role="log"
        aria-live="polite"
        onScroll={handleScroll}
      >
        {loading ? (
          <p className="text-base text-white/80">loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-base text-white/80 text-center">
            no messages yet. say hi, or hit generate starter.
          </p>
        ) : (
          <>
            {messages.map((m, i) => {
              const showDivider = startsNewDay(i);
              const continues = continuesGroup(i);
              const endsGroup =
                i === messages.length - 1 || !continuesGroup(i + 1);
              const member = members.find((mm) => mm.id === m.sender_id);
              // != null, not !==: a row from before the replies migration has
              // no reply_to at all (undefined), and that isn't a reply either.
              const isReply = m.reply_to != null;
              const original = isReply
                ? (byId.get(m.reply_to as number) ?? null)
                : null;

              // Spacing comes only from here, never from the bubble itself:
              // 4px inside a group, 16px between groups, nothing extra right
              // under a day divider (it has its own margin) or on the first row.
              let gapClass = '';
              if (!showDivider && i > 0) gapClass = continues ? 'mt-1' : 'mt-4';

              return (
                <div key={m.id} id={`msg-${m.id}`} className={gapClass}>
                  {showDivider && (
                    <div className="flex justify-center mb-2 mt-4">
                      <span className="text-base text-white/80 bg-white/5 px-3 py-1 rounded-full">
                        {dayLabel(m.created_at)}
                      </span>
                    </div>
                  )}
                  <ChatMessage
                    message={m}
                    myId={myId}
                    member={member ?? null}
                    startsGroup={!continues}
                    endsGroup={endsGroup}
                    isReply={isReply}
                    original={original}
                    originalName={original ? nameFor(original) : ''}
                    highlighted={highlightedId === m.id}
                    onReply={startReply}
                    onJumpTo={jumpTo}
                  />
                </div>
              );
            })}
          </>
        )}
      </div>

      {newMessages && (
        <button
          onClick={scrollToBottom}
          className="mx-auto mb-2 rounded-lg bg-pink px-3 py-1 text-base text-white transition focus-visible:outline-2 focus-visible:outline-white"
        >
          new messages ↓
        </button>
      )}

      <form onSubmit={(e) => {
        e.preventDefault();
        void handleSend();
      }} className="p-4">
        {error && (
          <p role="alert" className="mb-2 text-base text-pink">
            {error}
          </p>
        )}
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-lg border-2 border-pink px-4 py-1 text-base text-white transition hover:bg-pink/20 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50"
          >
            {generating ? 'generating…' : 'generate starter'}
          </button>
          <button
            type="button"
            onClick={() => {
              const g = game ?? 'a game';
              insertText(`anyone up for ${g} tonight? i'm free from 9, who's in? `);
            }}
            className="rounded-lg border-2 border-pink px-4 py-1 text-base text-white transition hover:bg-pink/20 focus-visible:outline-2 focus-visible:outline-white"
          >
            play tonight?
          </button>
          <p role="status" className="text-base text-white/80">
            {starterNote}
          </p>
        </div>
        {/* What you're replying to, right above the textarea. */}
        {replyTarget && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border-l-[3px] border-pink bg-white/10 px-3 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-base text-white/80">
                replying to {nameFor(replyTarget)}
              </p>
              <p className="truncate text-base text-white">
                {replyTarget.body.split('\n')[0]}
              </p>
            </div>
            <button
              type="button"
              onClick={cancelReply}
              aria-label="cancel reply"
              className="shrink-0 rounded px-2 text-xl text-white/80 hover:text-pink focus-visible:outline-2 focus-visible:outline-white"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
              if (e.key === 'Escape' && replyTarget) {
                e.preventDefault();
                setReplyingTo(null);
              }
              // Shift+Enter: default textarea behaviour inserts a newline.
            }}
            rows={2}
            aria-label="message your squad"
            className="flex-1 resize-none bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-base text-white focus:outline-none focus:ring-2 focus:ring-pink"
            placeholder="Type a message, and get to know your new friends..."
          ></textarea>
          <button
            type="submit"
            disabled={!body.trim()}
            className="rounded-lg bg-pink px-6 py-2 text-base text-white transition hover:scale-105 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-white"
          >
            send
          </button>
        </div>
      </form>
    </section>
  );
}


