import { useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { Navigate, useNavigate } from 'react-router';
import Header from '../components/Header.tsx';
import Footer from '../components/Footer.tsx';
import { PageLoading, Spinner } from '../components/Spinner.tsx';
import { useAuth } from '../hooks/useAuth.tsx';
import { joinQueue, saveOnboarding, signOut } from '../backend-tools';
import { GAMES, HOBBIES } from '../data/options.ts';
import { AVATARS } from '../data/avatars.ts';
import TagPicker from '../components/TagPicker.tsx';
import AvatarPicker from '../components/AvatarPicker.tsx';

// Adds the value if it's missing, removes it if it's there
const toggleValue = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

// The form itself. Only mounted once we know who the user is, so the name can be prefilled.
function OnboardingForm({ user, onUnderAge }: { user: User; onUnderAge: () => void }) {
  const navigate = useNavigate();

  // Prefilled from the Google account; the user can change it
  const [name, setName] = useState<string>(user.user_metadata?.full_name ?? '');
  const [age, setAge] = useState('');
  // Only the cups: we deliberately never use the Google account's photo
  const [avatar, setAvatar] = useState(AVATARS[0].value);
  const [games, setGames] = useState<string[]>([]);
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Check here too, so users get a clear message instead of the generic "invalid"
    if (!name.trim()) return setError('please enter a display name.');
    if (!age) return setError('please enter your age.');
    if (games.length === 0) return setError('pick at least one game.');
    if (hobbies.length === 0) return setError('pick at least one hobby.');

    setSaving(true);
    try {
      await saveOnboarding({ display_name: name.trim(), age: Number(age), games, hobbies, avatar_url: avatar });
      // The one time we join the queue. From here the matcher works in the background
      // (seconds to days); home only reads the status. We wait for it so that home
      // already sees the queue row when it loads.
      await joinQueue();
      navigate('/', { replace: true });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'under_18') {
        onUnderAge();
        await signOut();
      } else if (code === 'invalid') {
        setError('something in the form isn\'t right. check your name is 40 characters or fewer.');
      } else {
        // Saving again is safe (upserts), and so is joining again (keeps your place in line)
        setError('couldn\'t finish setting you up. try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-8 py-12">
      <h1 className="mb-2 text-6xl">tell us about you.</h1>
      <p className="mb-8 text-2xl">
        We use your games and hobbies to build your squad and pick conversation starters. We never show them to anyone.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <label className="flex flex-col gap-2 text-3xl">
          display name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            required
            className="rounded-lg bg-white px-4 py-2 text-2xl text-navy focus-visible:outline-2 focus-visible:outline-pink"
          />
        </label>

        <label className="flex flex-col gap-2 text-3xl">
          age
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            required
            className="w-32 rounded-lg bg-white px-4 py-2 text-2xl text-navy focus-visible:outline-2 focus-visible:outline-pink"
          />
        </label>

        <AvatarPicker picked={avatar} onPick={setAvatar} />

        <TagPicker label="games" options={GAMES} picked={games} onToggle={(v) => setGames(toggleValue(games, v))} />
        <TagPicker label="hobbies" options={HOBBIES} picked={hobbies} onToggle={(v) => setHobbies(toggleValue(hobbies, v))} />

        {error && <p role="alert" className="text-2xl text-pink">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-3 self-start rounded-lg bg-pink px-8 py-2 text-2xl text-white transition hover:scale-105 ease-in-out hover:brightness-110 disabled:opacity-60"
        >
          {saving && <Spinner />}
          {saving ? 'finding your squad…' : 'find my squad'}
        </button>
      </form>
    </main>
  );
}

function Onboarding() {
  const { user, loading } = useAuth();
  // Lives out here because signing an under-18 out clears `user`, and we still want to show why
  const [underAge, setUnderAge] = useState(false);

  if (!underAge && loading) return <PageLoading />;
  if (!underAge && !user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen flex-col bg-navy">
      <Header />
      {underAge ? (
        <main className="flex flex-1 items-center justify-center px-8">
          <p role="alert" className="max-w-lg text-center text-3xl">
            sorry, the internet café is 18+ for now. nothing was saved.
          </p>
        </main>
      ) : (
        <OnboardingForm user={user!} onUnderAge={() => setUnderAge(true)} />
      )}
      <Footer />
    </div>
  );
}

export default Onboarding;
