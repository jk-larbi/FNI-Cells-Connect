-- Private one-to-one chat reactions and personal pinned messages.
-- Both tables are scoped to messages the signed-in member is allowed to read.
create table if not exists public.private_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id text not null references public.private_messages(id) on delete cascade,
  user_id text not null,
  user_name text not null,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  constraint private_message_reactions_unique unique (message_id, user_id, emoji)
);

create index if not exists private_message_reactions_message_idx
  on public.private_message_reactions (message_id);

alter table public.private_message_reactions enable row level security;
grant select, insert, delete on public.private_message_reactions to authenticated;

drop policy if exists private_message_reactions_read_participants on public.private_message_reactions;
create policy private_message_reactions_read_participants
  on public.private_message_reactions for select to authenticated
  using (
    exists (
      select 1 from public.private_messages pm
      where pm.id = message_id
        and (
          pm.sender_uid = (select auth.uid())::text
          or pm.recipient_uid = (select auth.uid())::text
          or private.is_admin()
        )
    )
  );

drop policy if exists private_message_reactions_insert_own on public.private_message_reactions;
create policy private_message_reactions_insert_own
  on public.private_message_reactions for insert to authenticated
  with check (
    user_id = (select auth.uid())::text
    and exists (
      select 1 from public.private_messages pm
      where pm.id = message_id
        and (
          pm.sender_uid = (select auth.uid())::text
          or pm.recipient_uid = (select auth.uid())::text
          or private.is_admin()
        )
    )
  );

drop policy if exists private_message_reactions_delete_own on public.private_message_reactions;
create policy private_message_reactions_delete_own
  on public.private_message_reactions for delete to authenticated
  using (user_id = (select auth.uid())::text);

create table if not exists public.private_message_pins (
  user_id text not null,
  message_id text not null references public.private_messages(id) on delete cascade,
  pinned_at timestamptz not null default now(),
  primary key (user_id, message_id)
);

create index if not exists private_message_pins_user_idx
  on public.private_message_pins (user_id, pinned_at desc);

alter table public.private_message_pins enable row level security;
grant select, insert, delete on public.private_message_pins to authenticated;

drop policy if exists private_message_pins_read_own on public.private_message_pins;
create policy private_message_pins_read_own
  on public.private_message_pins for select to authenticated
  using (user_id = (select auth.uid())::text);

drop policy if exists private_message_pins_insert_own on public.private_message_pins;
create policy private_message_pins_insert_own
  on public.private_message_pins for insert to authenticated
  with check (
    user_id = (select auth.uid())::text
    and exists (
      select 1 from public.private_messages pm
      where pm.id = message_id
        and (
          pm.sender_uid = (select auth.uid())::text
          or pm.recipient_uid = (select auth.uid())::text
          or private.is_admin()
        )
    )
  );

drop policy if exists private_message_pins_delete_own on public.private_message_pins;
create policy private_message_pins_delete_own
  on public.private_message_pins for delete to authenticated
  using (user_id = (select auth.uid())::text);
