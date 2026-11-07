import { supabase } from './supabase';

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

// Returns the user's squad and member list, or null if not in one yet.
export async function getMySquad(): Promise<Squad | null> {
  throw new Error('not implemented');
}

// Calls the form-squad Edge Function to build a squad for the signed-in user.
// Throws with .code = 'not_signed_in' | 'onboarding_incomplete' | 'not_enough_people' | 'internal'
export async function formSquad(): Promise<FormSquadResult> {
  throw new Error('not implemented');
}

// Decides which route the user should be on based on their auth + profile + squad state.
export async function nextRoute(): Promise<'/' | '/onboarding' | '/find' | '/squad'> {
  throw new Error('not implemented');
}
