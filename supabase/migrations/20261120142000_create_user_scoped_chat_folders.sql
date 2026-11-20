-- Persist personal chat folders and their memberships across devices.
create table if not exists public.chat_folders (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.profiles(id) on delete cascade,
  name text not null,
  icon text not null default 'folder',
  color text not null default 'blue',
  position integer not null default 0,
  included_chat_ids jsonb not null default '[]'::jsonb,
  excluded_chat_ids jsonb not null default '[]'::jsonb,
  include_all_groups boolean not null default false,
  include_all_direct boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_chat_folders_user_position
  on public.chat_folders(user_id, position, created_at);

create table if not exists public.chat_folder_conversations (
  id uuid primary key default gen_random_uuid(),
  folder_id text not null references public.chat_folders(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  conversation_id text not null,
  conversation_type text not null default 'direct'
    check (conversation_type in ('direct','community','saved')),
  created_at timestamptz not null default now(),
  unique(folder_id, conversation_id)
);
create index if not exists idx_chat_folder_conversations_user
  on public.chat_folder_conversations(user_id, folder_id);

alter table public.chat_folders enable row level security;
alter table public.chat_folder_conversations enable row level security;
grant select, insert, update, delete on public.chat_folders to authenticated;
grant select, insert, update, delete on public.chat_folder_conversations to authenticated;

drop policy if exists chat_folders_owner_all on public.chat_folders;
create policy chat_folders_owner_all on public.chat_folders
for all to authenticated
using (
  exists (select 1 from public.profiles p
    where p.id = chat_folders.user_id and p.supabase_user_id = (select auth.uid()))
)
with check (
  exists (select 1 from public.profiles p
    where p.id = chat_folders.user_id and p.supabase_user_id = (select auth.uid()))
);

drop policy if exists chat_folder_conversations_owner_all on public.chat_folder_conversations;
create policy chat_folder_conversations_owner_all on public.chat_folder_conversations
for all to authenticated
using (
  exists (select 1 from public.profiles p
    where p.id = chat_folder_conversations.user_id and p.supabase_user_id = (select auth.uid()))
  and exists (select 1 from public.chat_folders f
    where f.id = chat_folder_conversations.folder_id
      and f.user_id = chat_folder_conversations.user_id)
)
with check (
  exists (select 1 from public.profiles p
    where p.id = chat_folder_conversations.user_id and p.supabase_user_id = (select auth.uid()))
  and exists (select 1 from public.chat_folders f
    where f.id = chat_folder_conversations.folder_id
      and f.user_id = chat_folder_conversations.user_id)
);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_folders') then
    alter publication supabase_realtime add table public.chat_folders;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_folder_conversations') then
    alter publication supabase_realtime add table public.chat_folder_conversations;
  end if;
end $$;
