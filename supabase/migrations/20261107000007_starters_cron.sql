-- Runs the post-starters Edge Function every 30 minutes, so quiet squads get a fresh
-- conversation starter (and any squad whose formation starter failed gets one).
--
-- Same pattern as the matcher cron: the project URL and the shared secret come from
-- Vault (project_url and matcher_secret, set up in docs/SPEC.md, Setup). post-starters
-- checks the same MATCHER_SECRET as run-matcher, so there's no new secret to create.
select cron.schedule(
  'post-starters',
  '*/30 * * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
               || '/functions/v1/post-starters',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-matcher-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'matcher_secret')),
    body    := '{}'::jsonb
  );
  $$
);
