import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router';
import Header from '../components/Header.tsx';
import Footer from '../components/Footer.tsx';
import Avatar from '../components/Avatar.tsx';
import AvatarPicker from '../components/AvatarPicker.tsx';
import TagPicker from '../components/TagPicker.tsx';
import { PageLoading, Spinner } from '../components/Spinner.tsx';
import { useAuth } from '../hooks/useAuth.tsx';
import { getMyInterests, getMyProfile, saveOnboarding, signOut, type Interests, type Profile } from '../backend-tools';
import { GAMES, HOBBIES, type Option } from '../data/options.ts';
import { AVATARS, isPreset } from '../data/avatars.ts';

// Turns stored slugs like "rock-climbing" back into labels like "Rock climbing"
const labelsFor = (values: string[], options: Option[]) =>
  values.map((v) => options.find((o) => o.value === v)?.label ?? v);

// Adds the value if it's missing, removes it if it's there
const toggleValue = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

const buttonClass =
  'rounded-lg bg-pink px-8 py-2 text-2xl text-white transition hover:scale-105 ease-in-out hover:brightness-110 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-60';

function TagList({ title, labels }: { title: string; labels: string[] }) {
  return (
    <section>
      <h2 className="mb-2 text-3xl">{title}</h2>
      <ul className="flex flex-wrap gap-3">
        {labels.map((l) => (
          <li key={l} className="rounded-lg bg-pink px-4 py-1 text-xl text-white">{l}</li>
        ))}
      </ul>
    </section>
  );
}

// Same fields and rules as onboarding, prefilled with what's saved now.
// Saves through saveOnboarding(): it upserts both rows, so it works for edits too.
// Changing games or hobbies only affects future matching; squads you're already in stay as they are.
function EditProfileForm({ profile, interests, onSaved, onCancel }: {
  profile: Profile;
  interests: Interests | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(profile.display_name);
  const [age, setAge] = useState(String(profile.age));
  // Older profiles may have no picture (or a Google photo, which we no longer use): start on the first cup
  const [avatar, setAvatar] = useState(isPreset(profile.avatar_url) ? profile.avatar_url! : AVATARS[0].value);
  // Drop saved values that are no longer options (e.g. chess as a game), so they can't be saved back unseen
  const [games, setGames] = useState<string[]>(
    (interests?.games ?? []).filter((g) => GAMES.some((o) => o.value === g)));
  const [hobbies, setHobbies] = useState<string[]>(
    (interests?.hobbies ?? []).filter((h) => HOBBIES.some((o) => o.value === h)));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Clear messages here instead of the generic "invalid" from saveOnboarding()
    if (!name.trim()) return setError('please enter a display name.');
    if (!age) return setError('please enter your age.');
    if (Number(age) < 18) return setError('the internet café is 18+ for now.');
    if (games.length === 0) return setError('pick at least one game.');
    if (hobbies.length === 0) return setError('pick at least one hobby.');

    setSaving(true);
    try {
      await saveOnboarding({ display_name: name.trim(), age: Number(age), games, hobbies, avatar_url: avatar });
      onSaved();
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(code === 'invalid'
        ? 'something in the form isn\'t right. check your name is 40 characters or fewer.'
        : 'couldn\'t save your changes. try again.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <h1 className="text-6xl">edit profile</h1>

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
          min={18}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          required
          className="w-32 rounded-lg bg-white px-4 py-2 text-2xl text-navy focus-visible:outline-2 focus-visible:outline-pink"
        />
      </label>

      <AvatarPicker picked={avatar} onPick={setAvatar} />

      <TagPicker label="games" options={GAMES} picked={games} onToggle={(v) => setGames(toggleValue(games, v))} />
      <TagPicker label="hobbies" options={HOBBIES} picked={hobbies} onToggle={(v) => setHobbies(toggleValue(hobbies, v))} />
      <p className="text-xl opacity-80">
        your games and hobbies are used to build your squad and pick conversation starters. we never show them to anyone.
      </p>

      {error && <p role="alert" className="text-2xl text-pink">{error}</p>}

      <div className="flex flex-wrap gap-4">
        <button type="submit" disabled={saving} className={`flex items-center gap-3 ${buttonClass}`}>
          {saving && <Spinner />}
          {saving ? 'saving…' : 'save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border-2 border-pink px-8 py-2 text-2xl text-white transition hover:bg-pink/20 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-60"
        >
          cancel
        </button>
      </div>
    </form>
  );
}

// The user's own details. Games and hobbies are only ever shown to their owner, here.
function AccountDetails({ email }: { email: string | undefined }) {
  const [data, setData] = useState<{ profile: Profile | null; interests: Interests | null } | null>(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Loads (and after a save, reloads) the profile and interests
  const load = useCallback(() => {
    let mounted = true;
    Promise.all([getMyProfile(), getMyInterests()])
      .then(([profile, interests]) => { if (mounted) setData({ profile, interests }); })
      .catch(() => { if (mounted) setError(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => load(), [load]);

  if (error) return <p role="alert" className="text-2xl">couldn't load your account. try refreshing.</p>;
  if (!data) {
    return (
      <p className="flex items-center gap-4 text-2xl">
        <Spinner className="h-8 w-8 border-pink" />
        loading your account…
      </p>
    );
  }
  // No profile means onboarding isn't done yet
  if (!data.profile) return <Navigate to="/onboarding" replace />;

  const { profile, interests } = data;

  if (editing) {
    return (
      <EditProfileForm
        profile={profile}
        interests={interests}
        onCancel={() => setEditing(false)}
        onSaved={() => { load(); setEditing(false); setJustSaved(true); }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-6">
        <Avatar name={profile.display_name} url={profile.avatar_url} className="h-24 w-24 text-4xl" />
        <div>
          <h1 className="text-6xl">{profile.display_name}</h1>
          <p className="text-2xl">age {profile.age}{email ? ` · ${email}` : ''}</p>
        </div>
      </div>

      {justSaved && <p role="status" className="text-2xl text-pink">profile saved.</p>}

      <TagList title="your games" labels={labelsFor(interests?.games ?? [], GAMES)} />
      <TagList title="your hobbies" labels={labelsFor(interests?.hobbies ?? [], HOBBIES)} />

      <div className="flex flex-wrap gap-4">
        <button onClick={() => { setJustSaved(false); setEditing(true); }} className={buttonClass}>
          edit profile
        </button>
        <button
          onClick={signOut}
          className="rounded-lg border-2 border-pink px-8 py-2 text-2xl text-white transition hover:bg-pink/20 focus-visible:outline-2 focus-visible:outline-white"
        >
          sign out
        </button>
      </div>
    </div>
  );
}

function Account() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoading />;
  // Also covers signing out from this page: AuthProvider clears the user and we go home
  if (!user) return <Navigate to="/" replace />;

  return (
    <div
      className="flex min-h-screen flex-col bg-navy bg-cover bg-center"
      style={{ backgroundImage: "url('/profile_bg.png')" }}
      >
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-8 py-12">
        <AccountDetails email={user.email} />
      </main>
      <Footer />
    </div>
  );
}

export default Account;
