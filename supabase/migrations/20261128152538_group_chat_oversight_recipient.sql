create table if not exists public.group_chat_oversight_settings (
  id smallint primary key default 1 check (id = 1),
  overseer_profile_id text references public.profiles(id) on delete set null,
  updated_by_uid text,
  updated_at timestamptz not null default now()
);
alter table public.group_chat_oversight_settings enable row level security;
revoke all on public.group_chat_oversight_settings from anon, authenticated;
grant select on public.group_chat_oversight_settings to authenticated;
drop policy if exists group_chat_oversight_settings_admin_read on public.group_chat_oversight_settings;
create policy group_chat_oversight_settings_admin_read
  on public.group_chat_oversight_settings for select to authenticated
  using ((select private.is_fni_admin()));

create or replace function public.admin_set_group_chat_overseer(p_profile_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $function$
declare
  v_name text;
  v_uid text := (select auth.uid())::text;
begin
  if v_uid is null or not coalesce((select private.is_fni_admin()),false) then
    raise exception 'Administrator permission required.';
  end if;
  if p_profile_id is not null then
    select full_name into v_name from public.profiles
    where id = p_profile_id and is_active is true and coalesce(is_test_account,false) is false;
    if not found then raise exception 'Choose an active registered FNI member.'; end if;
  end if;
  insert into public.group_chat_oversight_settings(id,overseer_profile_id,updated_by_uid,updated_at)
  values(1,p_profile_id,v_uid,now())
  on conflict(id) do update set overseer_profile_id=excluded.overseer_profile_id,
    updated_by_uid=excluded.updated_by_uid,updated_at=now();
  return jsonb_build_object('profile_id',p_profile_id,'full_name',v_name);
end;
$function$;
revoke all on function public.admin_set_group_chat_overseer(text) from public, anon;
grant execute on function public.admin_set_group_chat_overseer(text) to authenticated;

create or replace function private.notify_group_chat_oversight_request()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_recipient_uid text;
begin
  select p.supabase_user_id::text into v_recipient_uid
  from public.group_chat_oversight_settings s
  join public.profiles p on p.id = s.overseer_profile_id
  where s.id = 1 and p.is_active is true
    and coalesce(p.is_test_account,false) is false
    and p.supabase_user_id is not null
  limit 1;

  if v_recipient_uid is not null then
    insert into public.notifications(id,user_id,title,message,type,channel,target_tab,action_url,metadata,is_read,created_at)
    values(gen_random_uuid()::text,v_recipient_uid,'Group approval requested',
      'A new group creation request for "' || new.group_name || '" needs your oversight.',
      'group_chat_approval_requested','in_app','admin-management','',
      jsonb_build_object('requestId',new.id,'groupName',new.group_name,'requestedBy',new.requested_by_uid,'oversight',true),
      false,now());
  end if;
  return new;
end;
$function$;
revoke all on function private.notify_group_chat_oversight_request() from public, anon, authenticated;
drop trigger if exists group_chat_oversight_request_notification on public.group_chat_creation_requests;
create trigger group_chat_oversight_request_notification
  after insert on public.group_chat_creation_requests
  for each row execute function private.notify_group_chat_oversight_request();
