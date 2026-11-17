create table if not exists public.cell_leadership_history (
  id uuid primary key default gen_random_uuid(),
  cell_id text not null references public.cells(id) on delete restrict,
  cell_name text not null,
  previous_leader_id text,
  previous_leader_name text,
  new_leader_id text,
  new_leader_name text,
  action text not null check (action in ('assigned','replaced','dismissed','transferred_out')),
  reason text,
  changed_by text not null,
  changed_by_name text not null,
  changed_at timestamptz not null default now()
);
create index if not exists cell_leadership_history_cell_date_idx on public.cell_leadership_history (cell_id, changed_at desc);
create index if not exists cell_leadership_history_leader_date_idx on public.cell_leadership_history (previous_leader_id, new_leader_id, changed_at desc);
alter table public.cell_leadership_history enable row level security;
drop policy if exists cell_leadership_history_admin_read on public.cell_leadership_history;
create policy cell_leadership_history_admin_read on public.cell_leadership_history for select to authenticated using (private.is_admin());
create or replace function public.admin_update_cell_leader(p_cell_id text,p_new_leader_id text default null,p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public, private, pg_temp as $$
declare
 v_cell public.cells%rowtype; v_old_profile public.profiles%rowtype; v_new_profile public.profiles%rowtype; v_actor public.profiles%rowtype; v_source_cell public.cells%rowtype; v_action text;
begin
 if auth.uid() is null or not private.is_admin() then raise exception 'Administrator access is required.'; end if;
 select * into v_actor from public.profiles where supabase_user_id=auth.uid() and role in ('admin','super_admin','national_admin') and is_active=true limit 1;
 select * into v_cell from public.cells where id=p_cell_id and coalesce(is_archived,false)=false for update;
 if not found then raise exception 'Cell not found or archived.'; end if;
 if coalesce(v_cell.leader_id,v_cell.tutor_uid) is not null then
   select * into v_old_profile from public.profiles where id=coalesce(v_cell.leader_id,v_cell.tutor_uid);
 end if;
 if p_new_leader_id is not null then
   select * into v_new_profile from public.profiles where id=p_new_leader_id and role in ('tutor','cell_leader') and is_active=true for update;
   if not found then raise exception 'Select an active registered tutor.'; end if;
   select * into v_source_cell from public.cells where id<>p_cell_id and coalesce(is_archived,false)=false and (leader_id=p_new_leader_id or tutor_uid=p_new_leader_id) order by updated_at desc nulls last limit 1 for update;
   if found then
     update public.cells set leader_id=null,tutor_uid=null,leader_name=null,leader_phone=null,updated_at=now() where id=v_source_cell.id;
     insert into public.cell_leadership_history(cell_id,cell_name,previous_leader_id,previous_leader_name,new_leader_id,new_leader_name,action,reason,changed_by,changed_by_name)
     values(v_source_cell.id,v_source_cell.name,p_new_leader_id,v_new_profile.full_name,null,null,'transferred_out',coalesce(nullif(trim(p_reason),''),'Leader transferred to '||v_cell.name),auth.uid()::text,coalesce(v_actor.full_name,'FNI Administrator'));
   end if;
 end if;
 update public.profiles set cell_id=null,cell_name=null,updated_at=now()
 where id=coalesce(v_cell.leader_id,v_cell.tutor_uid) and cell_id=p_cell_id;
 if p_new_leader_id is null then v_action:='dismissed';
 elsif coalesce(v_cell.leader_id,v_cell.tutor_uid) is null then v_action:='assigned';
 else v_action:='replaced'; end if;
 update public.cells set leader_id=p_new_leader_id,tutor_uid=p_new_leader_id,
  leader_name=case when p_new_leader_id is null then null else v_new_profile.full_name end,
  leader_phone=case when p_new_leader_id is null then null else v_new_profile.phone_number end,updated_at=now()
 where id=p_cell_id;
 if p_new_leader_id is not null then update public.profiles set cell_id=p_cell_id,cell_name=v_cell.name,updated_at=now() where id=p_new_leader_id; end if;
 insert into public.cell_leadership_history(cell_id,cell_name,previous_leader_id,previous_leader_name,new_leader_id,new_leader_name,action,reason,changed_by,changed_by_name)
 values(p_cell_id,v_cell.name,coalesce(v_cell.leader_id,v_cell.tutor_uid),coalesce(v_old_profile.full_name,v_cell.leader_name),p_new_leader_id,case when p_new_leader_id is null then null else v_new_profile.full_name end,v_action,nullif(trim(coalesce(p_reason,'')),''),auth.uid()::text,coalesce(v_actor.full_name,'FNI Administrator'));
 return jsonb_build_object('cell_id',p_cell_id,'cell_name',v_cell.name,'action',v_action,'previous_leader',coalesce(v_old_profile.full_name,v_cell.leader_name),'new_leader',case when p_new_leader_id is null then null else v_new_profile.full_name end);
end; $$;
revoke all on function public.admin_update_cell_leader(text,text,text) from public,anon;
grant execute on function public.admin_update_cell_leader(text,text,text) to authenticated;
grant select on public.cell_leadership_history to authenticated;
