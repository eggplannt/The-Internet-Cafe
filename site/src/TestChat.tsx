// temporary, delete after testing
import { useEffect, useState } from 'react';
import {
  getMyProfile,
  getMySquad,
  nextRoute,
  signInWithGoogle,
  signOut,
} from './backend-tools';
import type { Profile, Squad } from './backend-tools';
import ChatPanel from './components/ChatPanel.tsx';

// Temporary test harness for the squad chat UI. Walks the auth/onboarding/
// squad chain using only backend-tools functions and renders ChatPanel when a
// squad exists. Deleted after testing.
export default function TestChat() {
  const [phase, setPhase] = useState<
    | 'loading'
    | 'signed-out'
    | 'no-profile'
    | 'no-squad'
    | 'ready'
  >('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [squad, setSquad] = useState<Squad | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // getMyProfile returns null both when nobody is signed in and when the
        // user is signed in but has no profile yet (see profile.ts), so
        // nextRoute() disambiguates the two null cases.
        const me = await getMyProfile();
        if (!me) {
          const route = await nextRoute();
          if (!mounted) return;
          setPhase(route === '/' ? 'signed-out' : 'no-profile');
          return;
        }
        setProfile(me);
        const squadData = await getMySquad();
        if (!mounted) return;
        if (!squadData) {
          setPhase('no-squad');
        } else {
          setSquad(squadData);
          setPhase('ready');
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    }

    void init();
    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return <p className="p-4 text-pink">{error}</p>;
  }
  if (phase === 'loading') {
    return <p className="p-4 text-white">loading…</p>;
  }
  if (phase === 'signed-out') {
    return (
      <div className="p-4 text-white">
        <p>Not signed in.</p>
        <button
          onClick={() => void signInWithGoogle()}
          className="rounded-lg bg-pink px-6 py-2 text-xl text-white"
        >
          sign in with Google
        </button>
      </div>
    );
  }
  if (phase === 'no-profile') {
    return (
      <p className="p-4 text-white">
        no profile yet, ask Emeka to add you
      </p>
    );
  }
  if (phase === 'no-squad') {
    return <p className="p-4 text-white">no squad yet</p>;
  }

  return (
    <div className="p-4 text-white">
      <p className="mb-2">signed in as {profile?.display_name}</p>
      <button
        onClick={() => void signOut()}
        className="rounded-lg bg-pink px-6 py-2 text-xl text-white mb-4"
      >
        sign out
      </button>
      <div className="h-[70vh]">
        <ChatPanel
          squadId={squad!.squad_id}
          myId={profile!.id}
          members={squad!.members}
        />
      </div>
    </div>
  );
}
