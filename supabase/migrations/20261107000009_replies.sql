-- Replies: a member message can quote an earlier message from the same squad, shown
-- as a small quote above the reply in the chat (see docs/SPEC.md, Chat).

-- 1. reply_to is the id of the message being replied to. Null for ordinary messages.
--    Starters inserted by the server never set it, so nothing changes for them.
alter table public.messages add column reply_to bigint;

-- 2. Replies must stay inside one squad. A plain foreign key on reply_to alone would let
--    someone reply to (and so confirm the existence of) a message in another squad.
--    The composite key (reply_to, squad_id) -> (id, squad_id) forces the original to have
--    the reply's own squad_id. A foreign key needs a unique target, so (id, squad_id) is
--    declared unique; it already is in practice, because id alone is the primary key.
--    When reply_to is null the key isn't checked (the default MATCH SIMPLE).
alter table public.messages
  add constraint messages_id_squad_unique unique (id, squad_id);
alter table public.messages
  add constraint messages_reply_to_same_squad
  foreign key (reply_to, squad_id) references public.messages (id, squad_id);

-- Default NO ACTION on delete: v1 has no message deletes. Deleting a squad cascades to
-- all of its messages in one statement, and NO ACTION is only checked at the end of that
-- statement, when the replies are gone too, so it never blocks.
-- Caveat: deleting a user also cascades to their messages (messages.sender_id). If someone
-- else replied to one of them, that delete is refused until the reply is removed.

-- 3. No change to RLS or grants. messages_insert (from 20261107000006_starters.sql) still
--    requires kind = 'user', meta is null, sender_id = auth.uid() and squad membership.
--    Clients keep their table-wide select and insert grants on messages, which cover the
--    new reply_to column (Realtime sends it too).
