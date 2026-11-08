import { useState } from 'react';
import { Navigate } from 'react-router';
import { joinQueue } from '../backend-tools';
import Header from '../components/Header.tsx';
import Hero from '../components/Hero.tsx';
import Footer from '../components/Footer.tsx';
import { useMatchStatus } from '../hooks/useMatchStatus.ts';
import type { MatchStatus } from '../hooks/useMatchStatus.ts';

// What to tell a signed-in user about their matchmaking. Signed-out users
// (and the first moment while we check) see nothing extra, just the landing page.
function statusText(state: MatchStatus): string | null {
  switch (state.status) {
    case 'needs_onboarding':
      return 'finish your profile so we can find your squad.';
    case 'not_queued':
      return 'you\'re not in the queue for a squad right now.';
    case 'waiting':
      return 'looking for your squad… we\'ll match you as soon as we can!';
    case 'error':
      return 'something went wrong finding your squad. try refreshing.';
    default:
      return null;
  }
}

function App() {
  const matchmaking = useMatchStatus();
  // Nothing shows while the status loads: it's a quick read on every visit, not worth a line
  const message = statusText(matchmaking);
  const [joining, setJoining] = useState(false);

  // Starts matchmaking. Reloading afterwards lets the banner show the new status (waiting or matched).
  async function findSquad() {
    setJoining(true);
    try {
      await joinQueue();
    } finally {
      window.location.reload();
    }
  }

  // Signed in but no profile yet: finish onboarding first
  if (matchmaking.status === 'needs_onboarding') return <Navigate to="/onboarding" replace />;

  return (
    <div className="min-h-screen bg-navy">
      <Header />
      <main>
        {/* role="status" so screen readers announce changes, e.g. waiting → not in the queue */}
        <p role="status" aria-live="polite" className="flex items-center gap-3 bg-pink px-8 py-2 text-2xl text-white empty:hidden">
          {message}
        </p>
        {matchmaking.status === 'not_queued' && (
          <button
            type="button"
            onClick={findSquad}
            disabled={joining}
            className="mx-8 my-4 rounded-lg bg-pink px-6 py-2 text-2xl text-white transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-60"
          >
            {joining ? 'joining…' : 'find my squad'}
          </button>
        )}
        <Hero />
      </main>
      <Footer />
    </div>
  );
}

export default App;
