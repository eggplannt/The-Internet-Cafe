// Single import point for all backend interaction.
// Pages and hooks import from here, never from supabase.ts directly.
export { signInWithGoogle, signOut } from './auth';
export { getMyProfile, saveOnboarding } from './profile';
export type { Profile } from './profile';
export { getMySquad, formSquad, nextRoute } from './squad';
export type { Squad, SquadMember, FormSquadResult } from './squad';
export { listMessages, sendMessage, subscribeToMessages } from './messages';
export type { Message } from './messages';
