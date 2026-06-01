-- TaluSuri — enforce unique display names (case-insensitive).
-- Run once in the Supabase SQL editor. If it fails on existing duplicates, rename the
-- clashing rows first:  select lower(display_name), count(*) from public.profiles
--                       group by 1 having count(*) > 1;
create unique index if not exists profiles_display_name_unique
  on public.profiles (lower(display_name));
