-- TaluSuri — referrals. Each new account can record who invited it (?ref=<uid> in the link).
-- Run once in the Supabase SQL editor, AFTER schema.sql.
--
-- A user sets their own row's referred_by once at signup (RLS "own update" allows it); the
-- referrer's "ambassadeur" badge is derived client-side by counting rows that point to them.
alter table public.profiles add column if not exists referred_by uuid references auth.users on delete set null;
create index if not exists profiles_referred_by_idx on public.profiles (referred_by);
