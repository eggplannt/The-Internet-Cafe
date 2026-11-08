import { Navigate, useSearchParams } from 'react-router';
import Header from '../components/Header.tsx';
import Footer from '../components/Footer.tsx';
import Avatar from '../components/Avatar.tsx';
import ChatPanel from '../components/ChatPanel.tsx';
import OneTimeBanner from '../components/OneTimeBanner.tsx';
import { PageLoading, Spinner } from '../components/Spinner.tsx';
import { useAuth } from '../hooks/useAuth.tsx';
import { useMySquads } from '../hooks/useMySquads.ts';
import { useUnreadSquads } from '../hooks/useUnreadSquads.ts';
import type { Squad } from '../backend-tools';
import { GAMES } from '../data/options.ts';

const gameLabel = (slug: string) => GAMES.find((g) => g.value === slug)?.label ?? slug;
// Squads have no names, so we call each one after the game(s) everyone in it plays
const squadName = (squad: Squad) => squad.common_games.map(gameLabel).join(', ');

// The chat rooms: every squad you're in down the left, the open one's members along the top,
// and its chat below. Only names and avatars are shown, never anyone's games, hobbies or match details.
function ChatRooms({ myId }: { myId: string }) {
  const { squads, error } = useMySquads();
  // The open squad lives in the URL (?squad=<id>), so a refresh keeps you in the same room
  const [params, setParams] = useSearchParams();
  const open = squads?.find((s) => s.squad_id === params.get('squad')) ?? squads?.[0] ?? null;
  const unread = useUnreadSquads(squads?.map((s) => s.squad_id) ?? [], myId, open?.squad_id ?? null);

  if (error) return <p role="alert" className="text-2xl">couldn't load your squads. try refreshing.</p>;
  if (squads === null) {
    return (
      <p className="flex items-center gap-4 text-2xl">
        <Spinner className="h-8 w-8 border-pink" />
        loading your squads…
      </p>
    );
  }
  // Not matched yet: home shows where they are in the queue
  if (!open) return <Navigate to="/" replace />;

  return (
    // Sidebar on the left on wide screens; stacked above the chat on phones
    <div className="flex flex-1 flex-col gap-6 md:flex-row">
      <nav aria-label="your squads" className="md:w-64 md:shrink-0">
        <h2 className="mb-3 text-3xl">your squads</h2>
        <ul className="flex flex-col gap-2">
          {squads.map((s) => {
            const isOpen = s.squad_id === open.squad_id;
            return (
              <li key={s.squad_id}>
                <button
                  onClick={() => setParams({ squad: s.squad_id })}
                  aria-current={isOpen ? 'page' : undefined}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-4 py-2 text-left text-2xl transition focus-visible:outline-2 focus-visible:outline-white ${
                    isOpen ? 'bg-pink text-white' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <span>
                    {squadName(s)}
                    <span className="block text-lg opacity-80 overflow-y-auto scrollbar-none">{s.members.length} people</span>
                  </span>
                  {unread.has(s.squad_id) && (
                    <span className="h-3 w-3 shrink-0 rounded-full bg-pink ring-2 ring-white">
                      <span className="sr-only">new</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section aria-label={`${squadName(open)} squad`} className="flex min-w-0 flex-1 flex-col gap-4">
        {/* Everyone in the open squad, in one row (scrolls sideways if it doesn't fit) */}
        <ul className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
          {open.members.map((m) => (
            <li key={m.id} className="flex shrink-0 items-center gap-3 rounded-lg bg-white/10 px-4 py-2 text-2xl">
              <Avatar name={m.display_name} url={m.avatar_url} />
              {m.display_name}{m.id === myId && ' (you)'}
            </li>
          ))}
        </ul>
        <p className="text-2xl">
          you all play: <span className="text-pink">{squadName(open)}</span>
        </p>

        {/* key: each squad gets its own "first time opening this chat" check */}
        {/* A general hint only: we never say who shares what, other people's hobbies stay private */}
        <OneTimeBanner key={open.squad_id} storageKey={`chat-banner-seen:${open.squad_id}`}>
          there's likely someone here with a similar or the same hobby as you. say hi!
        </OneTimeBanner>

        <div className="h-[60vh] overflow-y-auto scrollbar-none">
          {/* key: a fresh chat (history + subscription) for each squad */}
          <ChatPanel key={open.squad_id} squadId={open.squad_id} myId={myId} members={open.members} />
        </div>
      </section>
    </div>
  );
}

function SquadPage() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoading />;
  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen flex-col bg-navy">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-8 py-12">
        <ChatRooms myId={user.id} />
      </main>
      <Footer />
    </div>
  );
}

export default SquadPage;
