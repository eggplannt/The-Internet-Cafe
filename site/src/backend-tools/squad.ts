import { supabase } from './supabase';
import { getMyProfile } from './profile';

export type SquadMember = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

export type Squad = {
  squad_id: string;
  common_games: string[];
  members: SquadMember[];
};

export type FormSquadResult = {
  squad_id: string;
  already_in_squad: boolean;
};

// Returns the user's squad with common games and member list, or null if not in one yet.
export async function getMySquad(): Promise<Squad | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Find the user's squad_id
  const { data: membership, error: memberErr } = await supabase
    .from('squad_members')
    .select('squad_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (memberErr) throw memberErr;
  if (!membership) return null;

  const squadId = membership.squad_id;

  // Fetch common_games from the squad row
  const { data: squad, error: squadErr } = await supabase
    .from('squads')
    .select('common_games')
    .eq('id', squadId)
    .single();
  if (squadErr) throw squadErr;

  // Fetch all members with their public profile fields
  const { data: members, error: membersErr } = await supabase
    .from('squad_members')
    .select('user_id, profiles(id, display_name, avatar_url)')
    .eq('squad_id', squadId);
  if (membersErr) throw membersErr;

  return {
    squad_id: squadId,
    common_games: squad.common_games,
    members: (members ?? []).map((m: { profiles: SquadMember | SquadMember[] }) => {
      const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      return { id: p.id, display_name: p.display_name, avatar_url: p.avatar_url };
    }),
  };
}

// Invokes the form-squad Edge Function. Calling it twice is safe — returns existing squad.
// Throws with .code for known error states the UI can switch on.
export async function formSquad(): Promise<FormSquadResult> {
  const { data, error } = await supabase.functions.invoke('form-squad', { body: {} });

  if (error) {
    // supabase-js wraps non-2xx responses — read the actual error code from the body
    const body = await (error as { context?: Response }).context?.json().catch(() => null);
    const code = body?.error ?? 'internal';
    const err = new Error(code) as Error & { code: string };
    err.code = code;
    throw err;
  }

  return data as FormSquadResult;
}

// Decides which route the signed-in user belongs on.
export async function nextRoute(): Promise<'/' | '/onboarding' | '/find' | '/squad'> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return '/';

  const profile = await getMyProfile();
  if (!profile) return '/onboarding';

  const squad = await getMySquad();
  if (!squad) return '/find';

  return '/squad';
}
