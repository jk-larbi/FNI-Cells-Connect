create table if not exists public.group_chat_creation_requests (
  id text primary key default gen_random_uuid()::text,
  requested_by_uid text not null,
  group_name text not null check (char_length(btrim(group_name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  requested_member_ids text[] not null default array[]::text[],
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  reviewed_by_uid text,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create index if not exists group_chat_creation_requests_status_created_idx
  on public.group_chat_creation_requests(status, created_at desc);

alter table public.group_chat_creation_requests enable row level security;
revoke all on public.group_chat_creation_requests from anon, authenticated;
grant select on public.group_chat_creation_requests to authenticated;

drop policy if exists group_chat_creation_requests_admin_read on public.group_chat_creation_requests;
create policy group_chat_creation_requests_admin_read
  on public.group_chat_creation_requests
  for select to authenticated
  using ((select private.is_fni_admin()));

drop function if exists public.create_fni_group(text,text,text[]);
create function public.create_fni_group(
  p_name text,
  p_description text default '',
  p_member_ids text[] default array[]::text[]
)
returns table(id text, name text, description text, created_at timestamptz, status text)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $function$
declare
  v_user_id text := (select auth.uid())::text;
  v_request_id text := gen_random_uuid()::text;
  v_group_id text := gen_random_uuid()::text;
  v_member_id text;
  v_name text := btrim(coalesce(p_name,''));
  v_description text := btrim(coalesce(p_description,''));
  v_is_admin boolean := coalesce((select private.is_fni_admin()), false);
begin
  if v_user_id is null then raise exception 'You must be signed in to create a group.'; end if;
  if length(v_name) < 1 or length(v_name) > 80 then raise exception 'Group name must be between 1 and 80 characters.'; end if;
  if length(v_description) > 300 then raise exception 'Group description must be 300 characters or fewer.'; end if;

  for v_member_id in
    select distinct requested.member_id
    from unnest(coalesce(p_member_ids, array[]::text[])) as requested(member_id)
    where requested.member_id is not null and requested.member_id <> v_user_id
  loop
    if not exists (
      select 1 from public.profiles p
      where p.id = v_member_id and coalesce(p.is_active,true) = true
        and coalesce(p.is_test_account,false) = false
    ) then
      raise exception 'One of the selected members is unavailable. Refresh the member list and try again.';
    end if;
  end loop;

  if v_is_admin then
    insert into public.group_chats(id,name,description,created_by_uid)
    values(v_group_id,v_name,v_description,v_user_id);
    insert into public.group_chat_members(group_id,user_id,member_role)
    values(v_group_id,v_user_id,'owner');
    insert into public.group_chat_members(group_id,user_id,member_role)
    select v_group_id, member_id, 'member'
    from (
      select distinct unnest(coalesce(p_member_ids,array[]::text[])) as member_id
    ) requested
    where member_id is not null and member_id <> v_user_id
    on conflict(group_id,user_id) do nothing;

    insert into public.audit_logs(id,user_id,user_name,action,entity_type,entity_id,details,created_at)
    values(gen_random_uuid()::text,v_user_id,
      coalesce((select p.full_name from public.profiles p where p.supabase_user_id = auth.uid() limit 1),'FNI Administrator'),
      'CREATE_GROUP_CHAT','group_chat',v_group_id,
      jsonb_build_object('name',v_name,'member_count',cardinality(coalesce(p_member_ids,array[]::text[])) + 1,'approval','administrator_created'),now());

    return query select v_group_id,v_name,v_description,now(),'approved'::text;
  else
    insert into public.group_chat_creation_requests(id,requested_by_uid,group_name,description,requested_member_ids)
    values(v_request_id,v_user_id,v_name,v_description,
      coalesce(array(select distinct unnest(coalesce(p_member_ids,array[]::text[]))),array[]::text[]));

    insert into public.notifications(id,user_id,title,message,type,channel,target_tab,action_url,metadata,is_read,created_at)
    values(gen_random_uuid()::text,'admin','Group creation approval requested',
      'A member has requested approval to create "' || v_name || '".',
      'group_chat_approval_requested','in_app','admin-management','',
      jsonb_build_object('requestId',v_request_id,'groupName',v_name,'requestedBy',v_user_id),
      false,now());

    insert into public.audit_logs(id,user_id,user_name,action,entity_type,entity_id,details,created_at)
    values(gen_random_uuid()::text,v_user_id,
      coalesce((select p.full_name from public.profiles p where p.supabase_user_id = auth.uid() limit 1),'FNI Member'),
      'REQUEST_GROUP_CHAT_APPROVAL','group_chat_request',v_request_id,
      jsonb_build_object('name',v_name,'requested_member_count',cardinality(coalesce(p_member_ids,array[]::text[])),'status','pending'),now());

    return query select v_request_id,v_name,v_description,now(),'pending'::text;
  end if;
end;
$function$;

revoke all on function public.create_fni_group(text,text,text[]) from public, anon;
grant execute on function public.create_fni_group(text,text,text[]) to authenticated;

create or replace function public.review_fni_group_chat_request(
  p_request_id text,
  p_decision text,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $function$
declare
  v_request public.group_chat_creation_requests%rowtype;
  v_actor_uid text := (select auth.uid())::text;
  v_actor_name text;
  v_group_id text := gen_random_uuid()::text;
  v_member_id text;
begin
  if v_actor_uid is null or not coalesce((select private.is_fni_admin()),false) then
    raise exception 'Administrator permission required.';
  end if;
  if p_decision not in ('approved','declined') then raise exception 'Choose approve or decline.'; end if;

  select * into v_request from public.group_chat_creation_requests
  where id = p_request_id for update;
  if not found then raise exception 'Group creation request not found.'; end if;
  if v_request.status <> 'pending' then raise exception 'This request has already been reviewed.'; end if;

  select coalesce(p.full_name,'FNI Administrator') into v_actor_name
  from public.profiles p where p.supabase_user_id = auth.uid() limit 1;

  if p_decision = 'approved' then
    insert into public.group_chats(id,name,description,created_by_uid)
    values(v_group_id,v_request.group_name,v_request.description,v_request.requested_by_uid);

    insert into public.group_chat_members(group_id,user_id,member_role)
    values(v_group_id,v_request.requested_by_uid,'owner')
    on conflict(group_id,user_id) do nothing;

    foreach v_member_id in array coalesce(v_request.requested_member_ids,array[]::text[]) loop
      if v_member_id <> v_request.requested_by_uid then
        insert into public.group_chat_members(group_id,user_id,member_role)
        values(v_group_id,v_member_id,'member')
        on conflict(group_id,user_id) do nothing;
      end if;
    end loop;
  end if;

  update public.group_chat_creation_requests
  set status = p_decision, reviewed_by_uid = v_actor_uid, reviewed_at = now(),
      review_note = nullif(btrim(coalesce(p_note,'')),'')
  where id = p_request_id;

  insert into public.audit_logs(id,user_id,user_name,action,entity_type,entity_id,details,created_at)
  values(gen_random_uuid()::text,v_actor_uid,coalesce(v_actor_name,'FNI Administrator'),
    case when p_decision='approved' then 'APPROVE_GROUP_CHAT_REQUEST' else 'DECLINE_GROUP_CHAT_REQUEST' end,
    'group_chat_request',p_request_id,
    jsonb_build_object('group_name',v_request.group_name,'status',p_decision,'group_id',case when p_decision='approved' then v_group_id else null end,'review_note',nullif(btrim(coalesce(p_note,'')),'')),now());

  insert into public.notifications(id,user_id,title,message,type,channel,target_tab,action_url,metadata,is_read,created_at)
  values(gen_random_uuid()::text,v_request.requested_by_uid,
    case when p_decision='approved' then 'Your group was approved' else 'Your group request was declined' end,
    case when p_decision='approved' then 'Your group "' || v_request.group_name || '" is ready in FNI Messages.'
      else 'Your request to create "' || v_request.group_name || '" was declined.' end,
    case when p_decision='approved' then 'group_chat_approved' else 'group_chat_declined' end,
    'in_app','messages',case when p_decision='approved' then 'group:' || v_group_id else '' end,
    jsonb_build_object('requestId',p_request_id,'groupId',case when p_decision='approved' then v_group_id else null end,'reviewNote',nullif(btrim(coalesce(p_note,'')),'')),
    false,now());

  if p_decision='approved' then
    foreach v_member_id in array coalesce(v_request.requested_member_ids,array[]::text[]) loop
      insert into public.notifications(id,user_id,title,message,type,channel,target_tab,action_url,metadata,is_read,created_at)
      values(gen_random_uuid()::text,v_member_id,'You were added to a group',
        'You have been added to "' || v_request.group_name || '".','group_chat_added','in_app','messages',
        'group:' || v_group_id,jsonb_build_object('groupId',v_group_id),false,now());
    end loop;
  end if;

  return jsonb_build_object('request_id',p_request_id,'status',p_decision,'group_id',case when p_decision='approved' then v_group_id else null end);
end;
$function$;

revoke all on function public.review_fni_group_chat_request(text,text,text) from public, anon;
grant execute on function public.review_fni_group_chat_request(text,text,text) to authenticated;
