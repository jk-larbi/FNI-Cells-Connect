create table if not exists public.private_chat_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id text not null,
  cleared_at timestamptz,
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, conversation_id)
);

create table if not exists public.private_message_hidden_for_user (
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, message_id)
);

alter table public.private_chat_preferences enable row level security;
alter table public.private_message_hidden_for_user enable row level security;

grant select, insert, update, delete on public.private_chat_preferences to authenticated;
grant select, insert, update, delete on public.private_message_hidden_for_user to authenticated;

drop policy if exists "Users manage their own private chat preferences" on public.private_chat_preferences;
create policy "Users manage their own private chat preferences"
on public.private_chat_preferences for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own hidden private messages" on public.private_message_hidden_for_user;
create policy "Users manage their own hidden private messages"
on public.private_message_hidden_for_user for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create index if not exists private_chat_preferences_user_updated_idx
  on public.private_chat_preferences (user_id, updated_at desc);
create index if not exists private_message_hidden_for_user_user_idx
  on public.private_message_hidden_for_user (user_id);
