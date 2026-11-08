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

// Returns the user's squad with common games and member list, or null if not in one yet.
export async function getMySquad(): Promise<Squad | null> {
  const user = await currentUser();
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
