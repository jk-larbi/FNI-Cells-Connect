-- Dedicated, public-read profile image bucket with authenticated owner-only uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fni-profile-avatars',
  'fni-profile-avatars',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload own FNI profile avatars" on storage.objects;
create policy "Users can upload own FNI profile avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'fni-profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete own FNI profile avatars" on storage.objects;
create policy "Users can delete own FNI profile avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'fni-profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- This table exposes only the public avatar URL and the account UUID, not profile PII.
create table if not exists public.profile_avatar_updates (
  user_id uuid primary key,
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table public.profile_avatar_updates enable row level security;
revoke all on public.profile_avatar_updates from anon, public;
grant select on public.profile_avatar_updates to authenticated;

drop policy if exists "Authenticated users can read profile avatar updates" on public.profile_avatar_updates;
create policy "Authenticated users can read profile avatar updates"
on public.profile_avatar_updates
for select
to authenticated
using (true);

create or replace function public.publish_profile_avatar_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  profile_auth_id uuid;
begin
  if new.avatar_url is not distinct from old.avatar_url then
    return new;
  end if;

  profile_auth_id := coalesce(
    new.supabase_user_id,
    case
      when new.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then new.id::uuid
      else null
    end
  );

  if profile_auth_id is not null then
    insert into public.profile_avatar_updates (user_id, avatar_url, updated_at)
    values (profile_auth_id, new.avatar_url, now())
    on conflict (user_id) do update
      set avatar_url = excluded.avatar_url,
          updated_at = excluded.updated_at;
  end if;

  return new;
end;
$$;

revoke all on function public.publish_profile_avatar_update() from public, anon, authenticated;

drop trigger if exists profiles_publish_avatar_update on public.profiles;
create trigger profiles_publish_avatar_update
after update of avatar_url on public.profiles
for each row
execute function public.publish_profile_avatar_update();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profile_avatar_updates'
  ) then
    alter publication supabase_realtime add table public.profile_avatar_updates;
  end if;
end;
$$;
