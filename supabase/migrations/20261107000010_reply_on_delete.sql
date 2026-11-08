-- When a message that was replied to is deleted (e.g. its sender's account is deleted and
-- their messages cascade away), keep the replies and just clear their reply_to.
-- The foreign key from 20261107000009_replies.sql had no ON DELETE action, so that delete
-- was refused instead. The column list "(reply_to)" matters: a plain SET NULL would also
-- null squad_id, which is not null. (Column lists on SET NULL need Postgres 15+.)
alter table public.messages
  drop constraint messages_reply_to_same_squad,
  add constraint messages_reply_to_same_squad
    foreign key (reply_to, squad_id) references public.messages (id, squad_id)
    on delete set null (reply_to);
