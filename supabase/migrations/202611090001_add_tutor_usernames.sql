alter table public.profiles
  add column if not exists username text;

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null and btrim(username) <> '';

comment on column public.profiles.username is
  'Unique tutor-selected username used for username/password sign-in.';
