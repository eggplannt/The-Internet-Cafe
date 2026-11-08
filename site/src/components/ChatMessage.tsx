import Avatar from './Avatar.tsx';
import type { SquadMember } from '../backend-tools';
import type { Message } from '../backend-tools';

interface ChatMessageProps {
  message: Message;
  myId: string;
  member: SquadMember | null;
  // First message of a run from the same sender (shows avatar + name).
  startsGroup: boolean;
  // Last message of that run (shows the visible timestamp).
  endsGroup: boolean;
  // Whether this message has a reply_to (the original may not be loaded).
  isReply: boolean;
  // The message this one replies to, if it's among the loaded messages.
  original: Message | null;
  // Display name of the original's sender ("Cafe", "you", or a member's name).
  originalName: string;
  // Briefly true after someone jumps here from a reply's quote.
  highlighted: boolean;
  onReply: (message: Message) => void;
  onJumpTo: (id: number) => void;
}

// Time only — the date now lives in the day divider above the message.
function sentAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function ChatMessage({
  message,
  myId,
  member,
  startsGroup,
  endsGroup,
  isReply,
  original,
  originalName,
  highlighted,
  onReply,
  onJumpTo,
}: ChatMessageProps) {
  const mine = message.sender_id === myId;
  const isSystem = message.kind === 'system' || message.sender_id === null;

  // Conversation starters from the app: centered card labelled "Cafe", no
  // avatar, no member lookup. Only riddles can be replied to, via "answer
  // this", which sits outside "Reveal answer" so replying never spoils it.
  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div
          className={`w-full min-w-0 max-w-[90%] rounded-lg border-2 border-pink/70 bg-white/5 px-4 py-3 text-center [overflow-wrap:anywhere] ${
            highlighted ? 'ring-2 ring-pink' : ''
          }`}
        >
          <p className="mb-1 text-base text-white/80">
            <span className="uppercase tracking-wider">Cafe</span>
            {' · '}<time dateTime={message.created_at}>{sentAt(message.created_at)}</time>
          </p>
          <p className="text-xl">{message.body}</p>
          {message.meta?.answer && (
            <>
              <button
                type="button"
                onClick={() => onReply(message)}
                className="mt-2 text-base text-pink underline underline-offset-4 hover:text-pink focus-visible:outline-2 focus-visible:outline-white"
              >
                answer this
              </button>
              <details className="mt-2 text-base">
                <summary className="cursor-pointer rounded text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink">
                  Reveal answer
                </summary>
                <p className="mt-1 text-base text-white/80">{message.meta.answer}</p>
              </details>
            </>
          )}
        </div>
      </div>
    );
  }

  // A reply to a Cafe riddle gets a small "riddle answer" pill and a thin ring.
  const answersRiddle = original?.kind === 'system' && !!original.meta?.answer;

  // The jump highlight wins over the riddle ring so the two never clash.
  let ringClass = '';
  if (highlighted) ringClass = 'ring-2 ring-pink';
  else if (answersRiddle) ringClass = 'ring-1 ring-white/50';

  const replyLabel = mine
    ? 'reply to your message'
    : `reply to ${member?.display_name ?? 'someone'}`;

  // Hidden until the row is hovered or the button has keyboard focus. Touch
  // screens can't hover, so it's always shown there (hover: none).
  const replyButton = (
    <button
      type="button"
      onClick={() => onReply(message)}
      aria-label={replyLabel}
      className="shrink-0 rounded px-1 text-base text-white/80 opacity-0 transition-opacity hover:text-pink focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-white group-hover:opacity-100 [@media(hover:none)]:opacity-100"
    >
      reply
    </button>
  );

  // Snapchat-style quote of the original, inside the reply's bubble. Darker
  // inset on your pink bubbles, lighter on everyone else's.
  const quoteClass = `mb-1 block w-full rounded border-l-[3px] px-2 py-1 text-left text-base ${
    mine ? 'border-white/70 bg-black/20 text-white' : 'border-pink bg-white/10 text-white/80'
  }`;
  const quote = original ? (
    <button
      type="button"
      onClick={() => onJumpTo(original.id)}
      aria-label={`jump to the original message from ${originalName}`}
      className={`${quoteClass} cursor-pointer focus-visible:outline-2 focus-visible:outline-white`}
    >
      <span className="block truncate text-white">{originalName}</span>
      <span className="line-clamp-2">{original.body}</span>
    </button>
  ) : (
    // Not in the loaded 200 messages: nothing to jump to.
    <div className={quoteClass}>
      <span className="line-clamp-2">an earlier message</span>
    </div>
  );

  return (
    <div className={`group flex gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar column, always w-10 wide: the avatar on the first message of
          someone else's group, an empty spacer after that so bubbles line up. */}
      {!mine && member && (
        startsGroup ? (
          <Avatar
            name={member.display_name}
            url={member.avatar_url}
            className="h-10 w-10 text-xl"
          />
        ) : (
          <div className="w-10 shrink-0" aria-hidden="true" />
        )
      )}
      {/* min-w-0 lets this column shrink inside the flex row, so long words
          wrap instead of pushing past the panel edge. */}
      <div
        className={`flex min-w-0 max-w-[80%] flex-col ${
          mine ? 'items-end' : 'items-start'
        }`}
      >
        {!mine && startsGroup && member && (
          <p className="max-w-full text-base text-white/80 [overflow-wrap:anywhere]">
            {member.display_name}
          </p>
        )}
        {/* Bubble with the reply button beside it (left of yours, right of others'). */}
        <div className="flex min-w-0 max-w-full items-center gap-1">
          {mine && replyButton}
          <div
            className={`min-w-0 rounded-lg px-3 py-1.5 [overflow-wrap:anywhere] ${
              mine ? 'bg-pink text-white' : 'bg-white/10'
            } ${ringClass}`}
          >
            {answersRiddle && (
              <p className="mb-1 w-fit rounded-full bg-white/10 px-2 text-base text-white">
                <span aria-hidden="true">✦ </span>riddle answer
              </p>
            )}
            {isReply && quote}
            <p className="text-xl">
              {isReply && (
                <span className="sr-only">
                  reply to {original ? originalName : 'an earlier message'}:{' '}
                </span>
              )}
              {message.body}
            </p>
          </div>
          {!mine && replyButton}
        </div>
        {/* Only the last message of a group shows its time; the others keep it
            for screen readers. */}
        <time
          dateTime={message.created_at}
          className={endsGroup ? 'mt-0.5 text-base text-white/80' : 'sr-only'}
        >
          {sentAt(message.created_at)}
        </time>
      </div>
    </div>
  );
}
