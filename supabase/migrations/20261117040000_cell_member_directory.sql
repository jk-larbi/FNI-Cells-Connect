-- Real cell member directory for people who do not need app accounts.
create table if not exists public.cell_members (
  id uuid primary key default gen_random_uuid(),
  cell_id text not null references public.cells(id) on delete cascade,
  full_name text not null check (length(btrim(full_name)) between 2 and 120),
  phone_number text,
  status text not null default 'Active' check (status in ('Active','Inactive','Needs Follow-up')),
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cell_members_cell_id_created_at_idx on public.cell_members (cell_id, created_at desc);
create index if not exists cell_members_cell_name_lower_idx on public.cell_members (cell_id, lower(full_name));
alter table public.cell_members enable row level security;
revoke all on public.cell_members from anon;
grant select, insert, update, delete on public.cell_members to authenticated;
drop policy if exists cell_members_select_authorized on public.cell_members;
create policy cell_members_select_authorized on public.cell_members for select to authenticated using (
  private.is_admin() or exists (
    select 1 from public.profiles p join public.cells c on c.id = cell_members.cell_id
    where p.supabase_user_id = (select auth.uid()) and p.role in ('tutor','cell_leader') and p.is_active is true
      and (p.cell_id = c.id or lower(btrim(coalesce(p.cell_name,''))) = lower(btrim(c.name)))
  )
);
drop policy if exists cell_members_insert_authorized on public.cell_members;
create policy cell_members_insert_authorized on public.cell_members for insert to authenticated with check (
  private.is_admin() or exists (
    select 1 from public.profiles p join public.cells c on c.id = cell_members.cell_id
    where p.supabase_user_id = (select auth.uid()) and p.role in ('tutor','cell_leader') and p.is_active is true
      and (p.cell_id = c.id or lower(btrim(coalesce(p.cell_name,''))) = lower(btrim(c.name)))
  )
);
drop policy if exists cell_members_update_authorized on public.cell_members;
create policy cell_members_update_authorized on public.cell_members for update to authenticated using (
  private.is_admin() or exists (
    select 1 from public.profiles p join public.cells c on c.id = cell_members.cell_id
    where p.supabase_user_id = (select auth.uid()) and p.role in ('tutor','cell_leader') and p.is_active is true
      and (p.cell_id = c.id or lower(btrim(coalesce(p.cell_name,''))) = lower(btrim(c.name)))
  )
) with check (
  private.is_admin() or exists (
    select 1 from public.profiles p join public.cells c on c.id = cell_members.cell_id
    where p.supabase_user_id = (select auth.uid()) and p.role in ('tutor','cell_leader') and p.is_active is true
      and (p.cell_id = c.id or lower(btrim(coalesce(p.cell_name,''))) = lower(btrim(c.name)))
  )
);
drop policy if exists cell_members_delete_authorized on public.cell_members;
create policy cell_members_delete_authorized on public.cell_members for delete to authenticated using (
  private.is_admin() or exists (
    select 1 from public.profiles p join public.cells c on c.id = cell_members.cell_id
    where p.supabase_user_id = (select auth.uid()) and p.role in ('tutor','cell_leader') and p.is_active is true
      and (p.cell_id = c.id or lower(btrim(coalesce(p.cell_name,''))) = lower(btrim(c.name)))
  )
);
create or replace function public.set_cell_member_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists cell_members_updated_at on public.cell_members;
create trigger cell_members_updated_at before update on public.cell_members for each row execute function public.set_cell_member_updated_at();
notify pgrst, 'reload schema';