// Run with: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed.mjs
// Never import this from src/ — it uses the service-role key.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, key);
const __dir = dirname(fileURLToPath(import.meta.url));
const seeds = JSON.parse(readFileSync(join(__dir, 'seed-data.json'), 'utf8'));

let created = 0;
let skipped = 0;

for (let i = 0; i < seeds.length; i++) {
  const seed = seeds[i];
  const email = `seed+${String(i + 1).padStart(2, '0')}@internetcafe.test`;

  // createUser returns an error if the email already exists
  const { data: { user }, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { seed: true },
  });

  if (error) {
    if (error.message?.includes('already been registered')) {
      console.log(`skip  ${email}`);
      skipped++;
      continue;
    }
    console.error(`error ${email}:`, error.message);
    continue;
  }

  await admin.from('profiles').insert({
    id: user.id,
    display_name: seed.display_name,
    age: seed.age,
    is_seed: true,
  });

  await admin.from('profile_private').insert({
    user_id: user.id,
    games: seed.games,
    hobbies: seed.hobbies,
  });

  console.log(`added ${email} — ${seed.display_name}`);
  created++;
}

console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
