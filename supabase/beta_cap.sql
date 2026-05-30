-- TaluSuri — closed-beta account cap.
-- Run in the Supabase SQL editor. Enforces a maximum number of profiles (accounts)
-- server-side, so the limit holds even if the client gate is bypassed. The client
-- (assets/js/config.js BETA_MAX_ACCOUNTS) shows a friendly "beta is full" message;
-- this trigger is the hard backstop. Raise/drop the cap by editing the 50 below.

create or replace function public.enforce_beta_cap() returns trigger
language plpgsql security definer as $$
begin
  if (select count(*) from public.profiles) >= 50 then
    raise exception 'TaluSuri closed beta is full (50 accounts).';
  end if;
  return new;
end$$;

drop trigger if exists beta_cap on public.profiles;
create trigger beta_cap before insert on public.profiles
  for each row execute function public.enforce_beta_cap();
