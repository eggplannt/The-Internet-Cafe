import { supabase, currentUser } from './supabase';

export type Interests = {
  games: string[];
  hobbies: string[];
};

export type Profile = {
  id: string;
  display_name: string;
  age: number;
  avatar_url: string | null;
};

type OnboardingInput = {
  display_name: string;
  age: number;
  games: string[];
  hobbies: string[];
};

// Returns the signed-in user's profile, or null if onboarding isn't done yet.
export async function getMyProfile(): Promise<Profile | null> {
  const user = await currentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, age, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Returns the signed-in user's own games and hobbies, or null if none are saved yet.
// Only ever reads your own row: RLS on profile_private allows nothing else.
export async function getMyInterests(): Promise<Interests | null> {
  const user = await currentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profile_private')
    .select('games, hobbies')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Saves name + age to profiles, then games + hobbies to profile_private.
// profile_private references profiles, so profiles must be upserted first.
export async function saveOnboarding(input: OnboardingInput): Promise<void> {
  const { display_name, age, games, hobbies } = input;

  if (age < 18) {
    const err = new Error('Must be 18 or older to use Internet Cafe.') as Error & { code: string };
    err.code = 'under_18';
    throw err;
  }

  if (!display_name || display_name.length > 40 || games.length === 0 || hobbies.length === 0) {
    const err = new Error('Invalid onboarding input.') as Error & { code: string };
    err.code = 'invalid';
    throw err;
  }

  const user = await currentUser();
  if (!user) {
    const err = new Error('Not signed in.') as Error & { code: string };
    err.code = 'invalid';
    throw err;
  }

  const { error: profileErr } = await supabase.from('profiles').upsert({
    id: user.id,
    display_name,
    age,
    avatar_url: user.user_metadata?.avatar_url ?? null,
  });
  if (profileErr) throw profileErr;

  const { error: privateErr } = await supabase.from('profile_private').upsert({
    user_id: user.id,
    games,
    hobbies,
    updated_at: new Date().toISOString(),
  });
  if (privateErr) throw privateErr;
}
