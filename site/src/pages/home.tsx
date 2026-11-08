import Header from '../components/Header.tsx';
import Hero from '../components/Hero.tsx';
import Footer from '../components/Footer.tsx';
import { useAutoJoinQueue } from '../hooks/useAutoJoinQueue.ts';
import type { AutoJoinState } from '../hooks/useAutoJoinQueue.ts';

// What to tell a signed-in user about their matchmaking. Signed-out users
// (and the first moment while we check) see nothing extra, just the landing page.
function statusText(state: AutoJoinState): string | null {
  switch (state.status) {
    case 'needs_onboarding':
      return 'finish your profile so we can find your squad.';
    case 'waiting':
      return 'looking for your squad… we\'ll match you as soon as enough people who share your games are around.';
    case 'matched':
      return 'your squad is ready!';
    case 'error':
      return 'something went wrong finding your squad. try refreshing.';
    default:
      return null;
  }
}

function App() {
  const matchmaking = useAutoJoinQueue();
  const message = statusText(matchmaking);

  return (
    <div className="min-h-screen bg-navy">
      <Header />
      <main>
        {/* role="status" so screen readers announce changes, e.g. waiting → matched */}
        <p role="status" aria-live="polite" className="bg-pink px-8 py-2 text-2xl text-white empty:hidden">
          {message}
        </p>
        <Hero />
      </main>
      <Footer />
    </div>
  );
}

export default App;
