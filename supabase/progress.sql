-- TaluSuri — store full learning progress on the profile, not just in browser localStorage.
-- Run once in the Supabase SQL editor, AFTER schema.sql.
--
-- xp / streak / week_* / month_* stay as their own columns (the leaderboard queries them).
-- Everything else durable (badges, learned words, lesson %, crash progress, goal, onboarded,
-- seen languages) is kept in one jsonb blob, merged across devices on login by auth.js.
alter table public.profiles add column if not exists progress jsonb not null default '{}'::jsonb;
