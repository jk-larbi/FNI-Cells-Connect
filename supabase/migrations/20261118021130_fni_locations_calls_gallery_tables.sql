-- Applied to the production FNI Supabase project on 2026-11-18.
-- Profile identifiers are TEXT in public.profiles; keep all references compatible.

alter table public.cells
  add column if not exists meeting_latitude double precision,
  add column if not exists meeting_longitude double precision;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='cells_meeting_coordinates_valid') then
    alter table public.cells add constraint cells_meeting_coordinates_valid
      check ((meeting_latitude is null and meeting_longitude is null)
        or (meeting_latitude between -90 and 90 and meeting_longitude between -180 and 180));
  end if;
end $$;

create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  caller_id text not null references public.profiles(id) on delete cascade,
  caller_name text not null, caller_avatar text, caller_cell text,
  receiver_id text references public.profiles(id) on delete set null,
  receiver_name text, receiver_avatar text, room_id text not null, room_title text,
  call_type text not null check (call_type in ('voice','video')),
  call_mode text not null default 'direct' check (call_mode in ('direct','group','cell')),
  cell_id text,
  status text not null default 'initiating'
    check (status in ('initiating','ringing','accepted','declined','busy','missed','ended','failed')),
  started_at timestamptz not null default now(), answered_at timestamptz, ended_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  created_at timestamptz not null default now()
);
create table if not exists public.call_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.call_sessions(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  user_name text not null, user_avatar text, user_cell text,
  role text not null default 'participant' check (role in ('host','participant')),
  is_muted boolean not null default false, is_video_enabled boolean not null default true,
  is_speaking boolean not null default false, joined_at timestamptz not null default now(),
  left_at timestamptz, unique(session_id,user_id)
);
create table if not exists public.call_history (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.call_sessions(id) on delete set null,
  user_id text not null references public.profiles(id) on delete cascade,
  peer_id text references public.profiles(id) on delete set null,
  peer_name text not null, peer_avatar text, peer_cell text,
  direction text not null check (direction in ('incoming','outgoing','missed')),
  call_type text not null check (call_type in ('voice','video')),
  call_mode text not null default 'direct' check (call_mode in ('direct','group','cell')),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  room_title text, created_at timestamptz not null default now()
);
create table if not exists public.call_blocked_users (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  blocked_user_id text not null references public.profiles(id) on delete cascade,
  reason text, created_at timestamptz not null default now(),
  unique(user_id,blocked_user_id), check(user_id <> blocked_user_id)
);
create index if not exists idx_call_sessions_caller on public.call_sessions(caller_id);
create index if not exists idx_call_sessions_receiver on public.call_sessions(receiver_id);
create index if not exists idx_call_sessions_room on public.call_sessions(room_id);
create index if not exists idx_call_sessions_status on public.call_sessions(status);
create index if not exists idx_call_participants_session on public.call_participants(session_id);
create index if not exists idx_call_participants_user on public.call_participants(user_id);
create index if not exists idx_call_history_user on public.call_history(user_id);
create index if not exists idx_call_blocked_user on public.call_blocked_users(user_id);

create table if not exists public.gallery_albums (
  id text primary key default gen_random_uuid()::text,
  title text not null, description text, category text not null default 'training',
  cover_image_url text, created_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.gallery_items (
  id text primary key default gen_random_uuid()::text,
  title text not null, description text,
  media_type text not null check(media_type in ('photo','video','document')),
  category text not null, subcategory text,
  album_id text references public.gallery_albums(id) on delete set null,
  file_url text not null, thumbnail_url text, file_name text, file_size text, file_type text,
  duration_seconds integer, is_featured boolean not null default false,
  is_published boolean not null default false, allow_download boolean not null default true,
  tutor_access_level text not null default 'all_tutors'
    check(tutor_access_level in ('all_tutors','cell_leaders_only','executives_only')),
  uploaded_by text references public.profiles(id) on delete set null,
  uploaded_by_name text, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_gallery_items_media_type on public.gallery_items(media_type);
create index if not exists idx_gallery_items_album_id on public.gallery_items(album_id);
create index if not exists idx_gallery_items_published on public.gallery_items(is_published);
create index if not exists idx_gallery_items_featured on public.gallery_items(is_featured);
create index if not exists idx_gallery_items_created_at on public.gallery_items(created_at desc);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('fni-gallery-media','fni-gallery-media',true,104857600,
array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
