import { supabase } from './supabase';

export type Message = {
  id: number;
  squad_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

// Fetches the last 200 messages for a squad, oldest first.
export async function listMessages(_squadId: string): Promise<Message[]> {
  throw new Error('not implemented');
}

// Inserts a message into the squad. Throws with .code = 'invalid' if body is empty or over 2000 chars.
export async function sendMessage(_squadId: string, _body: string): Promise<void> {
  throw new Error('not implemented');
}

// Subscribes to new messages for a squad. Calls onInsert for each new message.
// Returns an unsubscribe function — call it on component unmount.
export function subscribeToMessages(
  _squadId: string,
  _onInsert: (message: Message) => void,
): () => void {
  throw new Error('not implemented');
}
