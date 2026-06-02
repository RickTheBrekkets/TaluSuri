-- TaluSuri — closed-beta account cap (scheduled).
-- Run in the Supabase SQL editor. Enforces a maximum number of profiles (accounts)
-- server-side, so the limit holds even if the client gate is bypassed. The client
-- (assets/js/config.js betaMax()) shows a friendly "beta is full" message; this trigger
-- is the hard backstop. Schedule (keep in sync with config.js):
--   • until 16 Jun 2026  → 50
--   • until 1 Jul 2026   → 250
--   • from Keti Koti (1 Jul 2026) → no cap (open to everyone)
-- Times are CEST (+02), matching the NL-diaspora audience.

create or replace function public.enforce_beta_cap() returns trigger
language plpgsql security definer as $$
declare cap int;
begin
  cap := case
    when now() < timestamptz '2026-06-16 00:00:00+02' then 50
    when now() < timestamptz '2026-07-01 00:00:00+02' then 250
    else null   -- cap lifted
  end;
  if cap is not null and (select count(*) from public.profiles) >= cap then
    raise exception 'TaluSuri beta is vol (% accounts).', cap;
  end if;
  return new;
end$$;

drop trigger if exists beta_cap on public.profiles;
create trigger beta_cap before insert on public.profiles
  for each row execute function public.enforce_beta_cap();
