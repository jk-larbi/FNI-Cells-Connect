-- Persist messages for FNI-created group chats.
-- Official/community cell conversations continue using community_messages.
create table if not exists public.group_chat_messages (
  id text primary key default gen_random_uuid()::text,
  group_id text not null references public.group_chats(id) on delete cascade,
  sender_uid text not null,
  content text not null default '',
  message_type text not null default 'text'
    check (message_type in ('text', 'image', 'video', 'audio', 'voice', 'document', 'location', 'poll', 'system')),
  reply_to jsonb,
  attachments jsonb not null default '[]'::jsonb,
  mentions jsonb not null default '[]'::jsonb,
  reactions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by text,
  is_pinned boolean not null default false,
  pinned_at timestamptz,
  pinned_by text,
  constraint group_chat_messages_content_or_attachment
    check (length(btrim(content)) > 0 or jsonb_array_length(attachments) > 0),
  constraint group_chat_messages_content_length
    check (length(content) <= 10000)
);

create index if not exists group_chat_messages_group_created_idx
  on public.group_chat_messages (group_id, created_at desc, id);

create index if not exists group_chat_messages_sender_created_idx
  on public.group_chat_messages (sender_uid, created_at desc);

alter table public.group_chat_messages enable row level security;
grant select, insert on public.group_chat_messages to authenticated;

drop policy if exists group_chat_messages_select_member on public.group_chat_messages;
create policy group_chat_messages_select_member
  on public.group_chat_messages
  for select to authenticated
  using (private.is_group_member(group_id));

drop policy if exists group_chat_messages_insert_member on public.group_chat_messages;
create policy group_chat_messages_insert_member
  on public.group_chat_messages
  for insert to authenticated
  with check (
    sender_uid = (select auth.uid())::text
    and private.is_group_member(group_id)
  );

do $$
begin
  alter publication supabase_realtime add table public.group_chat_messages;
exception when duplicate_object then null;
end $$;
