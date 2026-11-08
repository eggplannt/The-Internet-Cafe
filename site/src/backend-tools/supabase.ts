// The only place createClient is called. Every other file imports `supabase` from here.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const supabase = createClient(url, key);

// The signed-in user, read from the session supabase-js keeps in the browser.
// getUser() would ask the auth server on every call; getSession() doesn't, which saves a
// network round trip each time. That's safe here: the user id only picks which rows to ask
// for, and RLS still checks the real token on the server for every query.
// Internal to backend-tools (not re-exported from index.ts).
export async function currentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}
