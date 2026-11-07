import { supabase } from './supabase';

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
  throw new Error('not implemented');
}

// Saves name + age to profiles, games + hobbies to profile_private.
// Throws with .code = 'under_18' | 'invalid' on bad input.
export async function saveOnboarding(_input: OnboardingInput): Promise<void> {
  throw new Error('not implemented');
}
