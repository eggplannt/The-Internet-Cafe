-- Runs the run-matcher Edge Function every 5 minutes, so people waiting in the queue
-- get matched as others join and as their wait relaxes the squad-size rule.
--
-- The project URL and the shared secret live in Supabase Vault, not in this file, so
-- nothing secret is committed. Set them once per project (see docs/SPEC.md, Setup):
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<random secret>', 'matcher_secret');
-- and give the function the same secret: supabase secrets set MATCHER_SECRET=<random secret>
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'run-matcher',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
               || '/functions/v1/run-matcher',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-matcher-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'matcher_secret')),
    body    := '{}'::jsonb
  );
  $$
);
