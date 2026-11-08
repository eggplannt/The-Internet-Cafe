-- Chess is no longer a game option (it stays a hobby). Remove it from people's saved
-- games so edit-profile and future matching only see games that exist.
-- Anyone whose ONLY game is chess keeps it, so they don't end up with no games at all;
-- edit profile makes them pick a real game next time they save.
-- Existing squads keep their common_games, like any other profile edit (see SPEC.md).
update public.profile_private
set games = array_remove(games, 'chess'), updated_at = now()
where 'chess' = any(games) and cardinality(games) > 1;
