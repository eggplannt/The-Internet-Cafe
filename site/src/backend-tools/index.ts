// Single import point for all backend interaction.
// Pages and hooks import from here, never from supabase.ts directly.
export { signInWithGoogle, signOut } from './auth';
export { getMyProfile, getMyInterests, saveOnboarding } from './profile';
export type { Profile, Interests } from './profile';
export { getMySquad, nextRoute } from './squad';
export type { Squad, SquadMember } from './squad';
export { joinQueue, leaveQueue, getQueueStatus, subscribeToMatch } from './queue';
export type { JoinQueueResult } from './queue';
export { listMessages, sendMessage, subscribeToMessages } from './messages';
export type { Message } from './messages';
