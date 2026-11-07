// Run with: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/reset-squads.mjs
// Deletes all squads. Cascade clears squad_members, match_meta, and messages.
// Run before rehearsals and before judging.
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, key);
const { error } = await admin.from('squads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
if (error) {
  console.error('Reset failed:', error.message);
  process.exit(1);
}
console.log('All squads cleared.');
