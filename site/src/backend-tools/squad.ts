import { supabase, currentUser } from './supabase';
import { getMyProfile } from './profile';
import { getQueueStatus } from './queue';

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

// Returns every squad the user is in, oldest first, each with its common games and members.
// v1 allows one squad per user, but this works for any number, so nothing breaks once
// joining more than one is allowed. Three queries no matter how many squads.
export async function getMySquads(): Promise<Squad[]> {
  const user = await currentUser();
  if (!user) return [];

  // Which squads am I in?
  const { data: memberships, error: memberErr } = await supabase
    .from('squad_members')
    .select('squad_id')
    .eq('user_id', user.id);
  if (memberErr) throw memberErr;
  const ids = (memberships ?? []).map((m: { squad_id: string }) => m.squad_id);
  if (ids.length === 0) return [];

  // Their common games
  const { data: squads, error: squadErr } = await supabase
    .from('squads')
    .select('id, common_games, created_at')
    .in('id', ids)
    .order('created_at', { ascending: true });
  if (squadErr) throw squadErr;

  // Everyone in those squads, with their public profile fields
  const { data: members, error: membersErr } = await supabase
    .from('squad_members')
    .select('squad_id, profiles(id, display_name, avatar_url)')
    .in('squad_id', ids);
  if (membersErr) throw membersErr;

  return (squads ?? []).map((sq: { id: string; common_games: string[] }) => ({
    squad_id: sq.id,
    common_games: sq.common_games,
    members: (members ?? [])
      .filter((m: { squad_id: string }) => m.squad_id === sq.id)
      .map((m: { profiles: SquadMember | SquadMember[] }) => {
        const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        return { id: p.id, display_name: p.display_name, avatar_url: p.avatar_url };
      }),
  }));
}

// Returns the user's first squad, or null if not in one yet.
// Kept for callers that only care whether you're matched (e.g. nextRoute).
export async function getMySquad(): Promise<Squad | null> {
  const squads = await getMySquads();
  return squads[0] ?? null;
}

// Decides which route the signed-in user belongs on.
export async function nextRoute(): Promise<'/' | '/onboarding' | '/find' | '/waiting' | '/squad'> {
  const user = await currentUser();
  if (!user) return '/';

  const profile = await getMyProfile();
  if (!profile) return '/onboarding';

  // Squad first: being matched beats being in the queue
  const squad = await getMySquad();
  if (squad) return '/squad';

  const queued = await getQueueStatus();
  if (queued) return '/waiting';

  return '/find';
}
