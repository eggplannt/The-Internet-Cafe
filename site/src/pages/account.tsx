import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import Header from '../components/Header.tsx';
import Footer from '../components/Footer.tsx';
import { PageLoading, Spinner } from '../components/Spinner.tsx';
import { useAuth } from '../hooks/useAuth.tsx';
import { getMyInterests, getMyProfile, signOut, type Interests, type Profile } from '../backend-tools';
import { GAMES, HOBBIES, type Option } from '../data/options.ts';

// Turns stored slugs like "rock-climbing" back into labels like "Rock climbing"
const labelsFor = (values: string[], options: Option[]) =>
  values.map((v) => options.find((o) => o.value === v)?.label ?? v);

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

// The user's own details. Games and hobbies are only ever shown to their owner, here.
function AccountDetails({ email }: { email: string | undefined }) {
  const [data, setData] = useState<{ profile: Profile | null; interests: Interests | null } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([getMyProfile(), getMyInterests()])
      .then(([profile, interests]) => { if (mounted) setData({ profile, interests }); })
      .catch(() => { if (mounted) setError(true); });
    return () => { mounted = false; };
  }, []);

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
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-6">
        {profile.avatar_url ? (
          // no-referrer: Google's avatar host sometimes refuses images requested from other sites
          <img src={profile.avatar_url} alt={profile.display_name} referrerPolicy="no-referrer" className="h-24 w-24 rounded-full" />
        ) : (
          <div aria-label={profile.display_name} className="flex h-24 w-24 items-center justify-center rounded-full bg-pink text-4xl">
            {profile.display_name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-6xl">{profile.display_name}</h1>
          <p className="text-2xl">age {profile.age}{email ? ` · ${email}` : ''}</p>
        </div>
      </div>

      <TagList title="your games" labels={labelsFor(interests?.games ?? [], GAMES)} />
      <TagList title="your hobbies" labels={labelsFor(interests?.hobbies ?? [], HOBBIES)} />
      <p className="text-xl">only you can see your games and hobbies.</p>

      <button
        onClick={signOut}
        className="self-start rounded-lg bg-pink px-8 py-2 text-2xl text-white transition hover:scale-105 ease-in-out hover:brightness-110"
      >
        sign out
      </button>
    </div>
  );
}

function Account() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoading />;
  // Also covers signing out from this page: AuthProvider clears the user and we go home
  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen flex-col bg-navy">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-8 py-12">
        <AccountDetails email={user.email} />
      </main>
      <Footer />
    </div>
  );
}

export default Account;
