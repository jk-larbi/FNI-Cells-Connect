-- Migration: In-App Voice & Video Calling System Schema
-- Created for FNI Cells Connect Calling & Group Meetings

create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references public.profiles(id) on delete cascade,
  caller_name text not null,
  caller_avatar text,
  caller_cell text,
  receiver_id uuid references public.profiles(id) on delete set null,
  receiver_name text,
  receiver_avatar text,
  room_id text not null,
  room_title text,
  call_type text not null check (call_type in ('voice', 'video')),
  call_mode text not null default 'direct' check (call_mode in ('direct', 'group', 'cell')),
  cell_id text,
  status text not null default 'initiating' check (status in ('initiating', 'ringing', 'accepted', 'declined', 'busy', 'missed', 'ended', 'failed')),
  started_at timestamptz default timezone('utc'::text, now()),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer default 0,
  created_at timestamptz default timezone('utc'::text, now())
);

create table if not exists public.call_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.call_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_name text not null,
  user_avatar text,
  user_cell text,
  role text not null default 'participant' check (role in ('host', 'participant')),
  is_muted boolean not null default false,
  is_video_enabled boolean not null default true,
  is_speaking boolean not null default false,
  joined_at timestamptz default timezone('utc'::text, now()),
  left_at timestamptz
);

create table if not exists public.call_history (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.call_sessions(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  peer_id uuid references public.profiles(id) on delete set null,
  peer_name text not null,
  peer_avatar text,
  peer_cell text,
  direction text not null check (direction in ('incoming', 'outgoing', 'missed')),
  call_type text not null check (call_type in ('voice', 'video')),
  call_mode text not null default 'direct' check (call_mode in ('direct', 'group', 'cell')),
  duration_seconds integer not null default 0,
  room_title text,
  created_at timestamptz default timezone('utc'::text, now())
);

create table if not exists public.call_blocked_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  blocked_user_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  created_at timestamptz default timezone('utc'::text, now()),
  unique(user_id, blocked_user_id)
);

-- Indexes for performance
create index if not exists idx_call_sessions_caller on public.call_sessions(caller_id);
create index if not exists idx_call_sessions_receiver on public.call_sessions(receiver_id);
create index if not exists idx_call_sessions_room on public.call_sessions(room_id);
create index if not exists idx_call_sessions_status on public.call_sessions(status);
create index if not exists idx_call_participants_session on public.call_participants(session_id);
create index if not exists idx_call_participants_user on public.call_participants(user_id);
create index if not exists idx_call_history_user on public.call_history(user_id);
create index if not exists idx_call_blocked_user on public.call_blocked_users(user_id);

-- Enable Row Level Security
alter table public.call_sessions enable row level security;
alter table public.call_participants enable row level security;
alter table public.call_history enable row level security;
alter table public.call_blocked_users enable row level security;

-- Policies for call_sessions
drop policy if exists "Users can view sessions they participate in" on public.call_sessions;
create policy "Users can view sessions they participate in"
on public.call_sessions for select
to authenticated
using (
  caller_id = (select id from public.profiles where supabase_user_id = auth.uid())
  or receiver_id = (select id from public.profiles where supabase_user_id = auth.uid())
  or call_mode in ('group', 'cell')
);

drop policy if exists "Authenticated users can create call sessions" on public.call_sessions;
create policy "Authenticated users can create call sessions"
on public.call_sessions for insert
to authenticated
with check (
  caller_id = (select id from public.profiles where supabase_user_id = auth.uid())
);

drop policy if exists "Participants can update call sessions" on public.call_sessions;
create policy "Participants can update call sessions"
on public.call_sessions for update
to authenticated
using (
  caller_id = (select id from public.profiles where supabase_user_id = auth.uid())
  or receiver_id = (select id from public.profiles where supabase_user_id = auth.uid())
  or call_mode in ('group', 'cell')
);

-- Policies for call_participants
drop policy if exists "Users can view call participants" on public.call_participants;
create policy "Users can view call participants"
on public.call_participants for select
to authenticated
using (true);

drop policy if exists "Users can join or update their participation" on public.call_participants;
create policy "Users can join or update their participation"
on public.call_participants for all
to authenticated
using (
  user_id = (select id from public.profiles where supabase_user_id = auth.uid())
  or exists (
    select 1 from public.call_sessions cs
    where cs.id = session_id
    and cs.caller_id = (select id from public.profiles where supabase_user_id = auth.uid())
  )
);

-- Policies for call_history
drop policy if exists "Users can view own call history" on public.call_history;
create policy "Users can view own call history"
on public.call_history for select
to authenticated
using (
  user_id = (select id from public.profiles where supabase_user_id = auth.uid())
);

drop policy if exists "Users can insert own call history" on public.call_history;
create policy "Users can insert own call history"
on public.call_history for insert
to authenticated
with check (
  user_id = (select id from public.profiles where supabase_user_id = auth.uid())
);

-- Policies for call_blocked_users
drop policy if exists "Users can manage blocked users" on public.call_blocked_users;
create policy "Users can manage blocked users"
on public.call_blocked_users for all
to authenticated
using (
  user_id = (select id from public.profiles where supabase_user_id = auth.uid())
);

-- Realtime publication subscription
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'call_sessions'
  ) then
    alter publication supabase_realtime add table public.call_sessions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'call_participants'
  ) then
    alter publication supabase_realtime add table public.call_participants;
  end if;
end $$;
