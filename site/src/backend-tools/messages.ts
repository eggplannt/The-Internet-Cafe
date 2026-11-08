import { supabase } from './supabase';

// kind 'system' = a conversation starter posted by the server: no sender, and meta.answer
// holds a riddle's answer. Clients can only ever send 'user' messages.
export type Message = {
  id: number;
  squad_id: string;
  sender_id: string | null;
  kind: 'user' | 'system';
  meta: { answer?: string } | null;
  body: string;
  created_at: string;
};

// Fetches the last 200 messages for a squad, oldest first.
export async function listMessages(squadId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, squad_id, sender_id, kind, meta, body, created_at')
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
  // Unique name per call: supabase-js hands back the existing channel for a repeated name,
  // so the nav's unread dot and the chat would share one, and either unsubscribing would cut off both.
  const channel = supabase
    .channel(`squad:${squadId}:${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `squad_id=eq.${squadId}` },
      (payload) => onInsert(payload.new as Message),
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export type GenerateStarterResult = { source: 'llm' | 'bank'; fallback_reason: string | null };

// Asks the server to post a conversation starter in this squad now (the generate-starter
// Edge Function; the browser never calls the LLM). The starter itself arrives through
// subscribeToMessages like any message. Throws with .code: not_signed_in, not_member,
// too_soon (one per minute per squad), invalid or internal (the message says what failed).
export async function generateStarter(squadId: string): Promise<GenerateStarterResult> {
  const { data, error } = await supabase.functions.invoke('generate-starter', { body: { squad_id: squadId } });

  if (error) {
    // Same as joinQueue(): the real error code is in the response body
    const body = await (error as { context?: Response }).context?.json().catch(() => null);
    const code = body?.error ?? 'internal';
    const err = new Error(body?.detail ?? code) as Error & { code: string };
    err.code = code;
    throw err;
  }

  return data as GenerateStarterResult;
}
