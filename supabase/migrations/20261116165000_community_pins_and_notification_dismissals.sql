-- Community message pinning and per-user notification dismissal.
alter table public.community_messages
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by text;

create unique index if not exists community_messages_one_pinned_idx
  on public.community_messages ((is_pinned))
  where is_pinned = true;

create or replace function public.set_community_message_pin(p_message_id text, p_pinned boolean)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only FNI administrators can pin community messages';
  end if;
  if p_pinned then
    update public.community_messages set is_pinned = false, pinned_at = null, pinned_by = null
      where is_pinned = true and id <> p_message_id;
    update public.community_messages set is_pinned = true, pinned_at = now(), pinned_by = auth.uid()::text
      where id = p_message_id and deleted_for_everyone_at is null;
    if not found then raise exception 'Community message not found or already deleted'; end if;
  else
    update public.community_messages set is_pinned = false, pinned_at = null, pinned_by = null where id = p_message_id;
    if not found then raise exception 'Community message not found'; end if;
  end if;
end;
$$;

revoke all on function public.set_community_message_pin(text, boolean) from public;
grant execute on function public.set_community_message_pin(text, boolean) to authenticated;

create table if not exists public.notification_dismissals (
  user_id text not null,
  notification_id text not null,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);
alter table public.notification_dismissals enable row level security;
grant select, insert, delete on public.notification_dismissals to authenticated;

drop policy if exists notification_dismissals_select_own on public.notification_dismissals;
create policy notification_dismissals_select_own on public.notification_dismissals for select to authenticated
  using (user_id = (select auth.uid())::text);
drop policy if exists notification_dismissals_insert_own on public.notification_dismissals;
create policy notification_dismissals_insert_own on public.notification_dismissals for insert to authenticated
  with check (user_id = (select auth.uid())::text);
drop policy if exists notification_dismissals_delete_own on public.notification_dismissals;
create policy notification_dismissals_delete_own on public.notification_dismissals for delete to authenticated
  using (user_id = (select auth.uid())::text);
