-- TaluSuri — weekly & monthly leaderboard columns.
-- Run in the Supabase SQL editor after schema.sql. Adds period XP counters to profiles.
--
-- The app stores XP earned in the current week/month alongside the period KEY that
-- counter belongs to (week_key = Monday's date YYYY-MM-DD, month_key = YYYY-MM). The
-- client treats a counter whose key != the current period as 0, so stale weeks/months
-- read as zero without a server cron. RLS from schema.sql already covers these columns
-- (public read; a user may only update their own row).

alter table public.profiles add column if not exists week_xp   int  not null default 0;
alter table public.profiles add column if not exists month_xp  int  not null default 0;
alter table public.profiles add column if not exists week_key  text;
alter table public.profiles add column if not exists month_key text;
