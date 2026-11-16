alter table public.private_messages add column if not exists edited_at timestamptz;
alter table public.community_messages add column if not exists edited_at timestamptz;

create table if not exists public.community_chat_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cleared_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.community_chat_preferences enable row level security;
drop policy if exists "Users manage their own community chat preferences" on public.community_chat_preferences;
create policy "Users manage their own community chat preferences"
on public.community_chat_preferences for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.community_message_hidden_for_user (
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id text not null references public.community_messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, message_id)
);
alter table public.community_message_hidden_for_user enable row level security;
drop policy if exists "Users manage their own hidden community messages" on public.community_message_hidden_for_user;
create policy "Users manage their own hidden community messages"
on public.community_message_hidden_for_user for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.fni_edit_chat_message(p_message_id text, p_scope text, p_content text)
returns boolean language plpgsql security definer set search_path = public as $$
declare changed integer := 0;
begin
  if auth.uid() is null or p_content is null or length(trim(p_content)) = 0 then return false; end if;
  if p_scope = 'private' then
    update public.private_messages set content = trim(p_content), edited_at = now()
    where id = p_message_id and sender_uid = auth.uid()::text and deleted_for_everyone_at is null;
    get diagnostics changed = row_count;
  elsif p_scope = 'community' then
    update public.community_messages set content = trim(p_content), edited_at = now()
    where id = p_message_id and sender_uid = auth.uid()::text and deleted_for_everyone_at is null;
    get diagnostics changed = row_count;
  else return false;
  end if;
  return changed = 1;
end;
$$;
revoke all on function public.fni_edit_chat_message(text,text,text) from public;
grant execute on function public.fni_edit_chat_message(text,text,text) to authenticated;
