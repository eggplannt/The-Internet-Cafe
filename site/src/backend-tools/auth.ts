import { supabase } from './supabase';

// Redirects the browser to Google sign-in. No return value.
export async function signInWithGoogle(): Promise<void> {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/' },
  });
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
