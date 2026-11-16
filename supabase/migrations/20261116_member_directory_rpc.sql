-- Expose only the fields needed to find another active FNI member.
-- The profiles table itself remains private under its existing RLS policies.
create or replace function public.get_member_directory()
returns table (
  id text,
  full_name text,
  username text,
  role text,
  cell_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.username,
    p.role,
    p.cell_name,
    p.avatar_url
  from public.profiles p
  where auth.uid() is not null
    and p.is_active is true
    and coalesce(p.is_onboarded, true) is true
    and p.id <> auth.uid()::text
  order by lower(p.full_name);
$$;

revoke all on function public.get_member_directory() from public;
revoke all on function public.get_member_directory() from anon;
grant execute on function public.get_member_directory() to authenticated;
