import { supabase } from './supabase';

export type Message = {
  id: number;
  squad_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

// Fetches the last 200 messages for a squad, oldest first.
export async function listMessages(squadId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, squad_id, sender_id, body, created_at')
    .eq('squad_id', squadId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) throw error;
  return data ?? [];
}

// Inserts a message. sender_id is set by the database default (auth.uid()).
export async function sendMessage(squadId: string, body: string): Promise<void> {
  const trimmed = body.trim();

  if (trimmed.length === 0 || trimmed.length > 2000) {
    const err = new Error('Message must be 1–2000 characters.') as Error & { code: string };
    err.code = 'invalid';
    throw err;
  }

  const { error } = await supabase
    .from('messages')
    .insert({ squad_id: squadId, body: trimmed });

  if (error) throw error;
}

// Opens a Realtime subscription for new messages in a squad.
// Returns an unsubscribe function — call it on component unmount.
export function subscribeToMessages(
  squadId: string,
  onInsert: (message: Message) => void,
): () => void {
  const channel = supabase
    .channel(`squad:${squadId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `squad_id=eq.${squadId}` },
      (payload) => onInsert(payload.new as Message),
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
