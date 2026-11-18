-- =========================================================================
-- FNI CELLS CONNECT: PERSONAL CHAT FOLDERS
-- Personal chat folders for Tutors and Administrators
-- =========================================================================

-- 1. CHAT FOLDERS TABLE
create table if not exists public.chat_folders (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  icon text not null default 'folder',
  color text not null default 'blue',
  position integer not null default 0,
  included_chat_ids text[] not null default '{}'::text[],
  excluded_chat_ids text[] not null default '{}'::text[],
  include_all_groups boolean not null default false,
  include_all_direct boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast user folder retrieval ordered by position
create index if not exists idx_chat_folders_user_pos 
  on public.chat_folders (user_id, position asc);

-- 2. CHAT FOLDER CONVERSATIONS RELATIONSHIP TABLE
create table if not exists public.chat_folder_conversations (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.chat_folders(id) on delete cascade,
  user_id text not null,
  conversation_id text not null,
  conversation_type text not null default 'direct', -- 'direct' | 'community' | 'saved'
  created_at timestamptz not null default now(),
  constraint chat_folder_conversations_folder_conv_key unique (folder_id, conversation_id)
);

create index if not exists idx_chat_folder_conversations_user 
  on public.chat_folder_conversations (user_id, folder_id);

-- Enable Row Level Security
alter table public.chat_folders enable row level security;
alter table public.chat_folder_conversations enable row level security;

-- Grants to authenticated and anon
grant select, insert, update, delete on public.chat_folders to authenticated, anon;
grant select, insert, update, delete on public.chat_folder_conversations to authenticated, anon;

-- RLS Policies for chat_folders (Only folder owner or admin can read/write)
drop policy if exists chat_folders_select on public.chat_folders;
create policy chat_folders_select on public.chat_folders
  for select to authenticated, anon
  using (user_id = (select auth.uid())::text or private.is_fni_admin());

drop policy if exists chat_folders_insert on public.chat_folders;
create policy chat_folders_insert on public.chat_folders
  for insert to authenticated, anon
  with check (user_id = (select auth.uid())::text or private.is_fni_admin());

drop policy if exists chat_folders_update on public.chat_folders;
create policy chat_folders_update on public.chat_folders
  for update to authenticated, anon
  using (user_id = (select auth.uid())::text or private.is_fni_admin());

drop policy if exists chat_folders_delete on public.chat_folders;
create policy chat_folders_delete on public.chat_folders
  for delete to authenticated, anon
  using (user_id = (select auth.uid())::text or private.is_fni_admin());

-- RLS Policies for chat_folder_conversations
drop policy if exists chat_folder_conversations_select on public.chat_folder_conversations;
create policy chat_folder_conversations_select on public.chat_folder_conversations
  for select to authenticated, anon
  using (user_id = (select auth.uid())::text or private.is_fni_admin());

drop policy if exists chat_folder_conversations_insert on public.chat_folder_conversations;
create policy chat_folder_conversations_insert on public.chat_folder_conversations
  for insert to authenticated, anon
  with check (user_id = (select auth.uid())::text or private.is_fni_admin());

drop policy if exists chat_folder_conversations_update on public.chat_folder_conversations;
create policy chat_folder_conversations_update on public.chat_folder_conversations
  for update to authenticated, anon
  using (user_id = (select auth.uid())::text or private.is_fni_admin());

drop policy if exists chat_folder_conversations_delete on public.chat_folder_conversations;
create policy chat_folder_conversations_delete on public.chat_folder_conversations
  for delete to authenticated, anon
  using (user_id = (select auth.uid())::text or private.is_fni_admin());

-- Realtime Publication for instant sync across devices
do $$
begin
  execute 'alter publication supabase_realtime add table public.chat_folders';
exception when others then null;
end $$;

do $$
begin
  execute 'alter publication supabase_realtime add table public.chat_folder_conversations';
exception when others then null;
end $$;
