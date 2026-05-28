-- ============================================================
-- AJS Judo Club — Supabase Schema
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query)
-- ============================================================

-- ─── TABLES ──────────────────────────────────────────────────

-- Profiles (extends auth.users, one row per user)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  email text not null,
  phone text,
  role text not null default 'athlete' check (role in ('admin', 'trainer', 'athlete')),
  belt_rank text check (belt_rank in ('white', 'yellow', 'orange', 'green', 'blue', 'brown', 'black')),
  date_of_birth date,
  joined_at date default now(),
  active boolean default true,
  avatar_url text,
  created_at timestamptz default now()
);

-- Training sessions
create table sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  session_type text default 'regular' check (session_type in ('regular', 'elite', 'strength', 'competition')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Check-ins
create table check_ins (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references profiles(id) on delete cascade not null,
  session_id uuid references sessions(id) on delete set null,
  checked_in_at timestamptz default now(),
  note text
);

-- Strength programs
create table programs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references profiles(id) on delete cascade not null,
  trainer_id uuid references profiles(id) not null,
  title text not null,
  description text,
  exercises jsonb not null default '[]',
  -- exercises shape: [{ "id": "uuid", "name": "Deadlift", "sets": 4, "reps": "6-8", "weight": "80kg", "notes": "keep back flat" }]
  status text default 'active' check (status in ('active', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Program logs (athlete marks sets as done)
create table program_logs (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references programs(id) on delete cascade not null,
  athlete_id uuid references profiles(id) on delete cascade not null,
  exercise_id text not null,
  logged_at timestamptz default now(),
  sets_completed int,
  reps_completed text,
  weight_used text,
  note text
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────

alter table profiles enable row level security;
alter table sessions enable row level security;
alter table check_ins enable row level security;
alter table programs enable row level security;
alter table program_logs enable row level security;

-- Helper function: get current user role
create or replace function get_my_role()
returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer;

-- PROFILES policies
create policy "Users can view own profile" on profiles
  for select using (id = auth.uid());

create policy "Trainers and admins can view all profiles" on profiles
  for select using (get_my_role() in ('admin', 'trainer'));

create policy "Admins can insert profiles" on profiles
  for insert with check (get_my_role() = 'admin');

create policy "Admins can update any profile" on profiles
  for update using (get_my_role() = 'admin');

create policy "Users can update own profile (limited)" on profiles
  for update using (id = auth.uid());

-- SESSIONS policies
create policy "All authenticated users can view sessions" on sessions
  for select using (auth.uid() is not null);

create policy "Admins and trainers can manage sessions" on sessions
  for all using (get_my_role() in ('admin', 'trainer'));

-- CHECK_INS policies
create policy "Athletes can insert own check-in" on check_ins
  for insert with check (athlete_id = auth.uid());

create policy "Admins and trainers can view all check-ins" on check_ins
  for select using (get_my_role() in ('admin', 'trainer'));

create policy "Athletes can view own check-ins" on check_ins
  for select using (athlete_id = auth.uid());

-- PROGRAMS policies
create policy "Trainers and admins can manage programs" on programs
  for all using (get_my_role() in ('admin', 'trainer'));

create policy "Athletes can view own programs" on programs
  for select using (athlete_id = auth.uid());

-- PROGRAM_LOGS policies
create policy "Athletes can insert own logs" on program_logs
  for insert with check (athlete_id = auth.uid());

create policy "Athletes can view own logs" on program_logs
  for select using (athlete_id = auth.uid());

create policy "Trainers and admins can view all logs" on program_logs
  for select using (get_my_role() in ('admin', 'trainer'));

-- ─── STORAGE ─────────────────────────────────────────────────
-- Create this bucket manually in Supabase Dashboard → Storage:
--   Bucket name: avatars
--   Public: true
--   File size limit: 5MB
--   Allowed MIME types: image/jpeg, image/png, image/webp

-- ─── SEED: TEST USERS ────────────────────────────────────────
-- After running this schema, create 3 users in Supabase Auth
-- (Authentication → Users → Invite user), then insert matching
-- profile rows below. Replace the UUIDs with actual auth user IDs.

-- Example seed (replace UUIDs):
-- insert into profiles (id, full_name, email, role, belt_rank, joined_at) values
--   ('00000000-0000-0000-0000-000000000001', 'Alexander Olsen', 'admin@ajsclub.dk', 'admin', 'black', '2020-01-01'),
--   ('00000000-0000-0000-0000-000000000002', 'Coach Hansen', 'trainer@ajsclub.dk', 'trainer', 'black', '2021-03-01'),
--   ('00000000-0000-0000-0000-000000000003', 'Lars Eriksen', 'lars@ajsclub.dk', 'athlete', 'brown', '2022-09-01');
