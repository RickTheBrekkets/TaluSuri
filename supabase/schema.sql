-- TaluSuri — Supabase schema for magic-link auth + real leaderboard.
-- Run once in the Supabase SQL editor when setting up a project.
-- The publishable/anon key in assets/js/config.js relies on the Row Level
-- Security policies below: everyone can read profiles (the leaderboard),
-- but a user may only insert/update their own row.

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  xp int not null default 0,
  streak int not null default 1,
  langs text default '',
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "public read"  on public.profiles for select using (true);            -- leaderboard readable by all
create policy "own insert"   on public.profiles for insert with check (auth.uid() = id);
create policy "own update"   on public.profiles for update using (auth.uid() = id);
