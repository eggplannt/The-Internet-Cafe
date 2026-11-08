import { Navigate } from 'react-router';
import Header from '../components/Header.tsx';
import Hero from '../components/Hero.tsx';
import Footer from '../components/Footer.tsx';
import { Spinner } from '../components/Spinner.tsx';
import { useAuth } from '../hooks/useAuth.tsx';
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
    case 'matched':
      return 'your squad is ready!';
    case 'error':
      return 'something went wrong finding your squad. try refreshing.';
    default:
      return null;
  }
}

function App() {
  const matchmaking = useMatchStatus();
  const { user } = useAuth();
  // Signed-in users get a "checking" line while we look up their status; visitors see nothing
  const checking = matchmaking.status === 'loading' && user !== null;
  const message = checking ? 'checking on your squad…' : statusText(matchmaking);

  // Signed in but no profile yet: finish onboarding first
  if (matchmaking.status === 'needs_onboarding') return <Navigate to="/onboarding" replace />;

  return (
    <div className="min-h-screen bg-navy">
      <Header />
      <main>
        {/* role="status" so screen readers announce changes, e.g. waiting → matched */}
        <p role="status" aria-live="polite" className="flex items-center gap-3 bg-pink px-8 py-2 text-2xl text-white empty:hidden">
          {checking && <Spinner />}
          {message}
        </p>
        <Hero />
      </main>
      <Footer />
    </div>
  );
}

export default App;
