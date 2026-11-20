-- Publish profile row updates so each account's other signed-in devices
-- can refresh that same profile. Realtime payload visibility is still governed
-- by existing profiles RLS; clients subscribe with an id filter for their row.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;
