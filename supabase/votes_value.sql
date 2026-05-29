-- TaluSuri — add up/down vote values to pronunciation voting.
-- Run once in the Supabase SQL editor, AFTER community.sql.
-- Adds a signed value to each vote (+1 up / -1 down) and a score view
-- (net score + up/down tallies) used by the recordings list, swipe deck,
-- contributor badges, and the admin promote gate.

alter table public.recording_votes add column if not exists value smallint not null default 1;
alter table public.recording_votes drop constraint if exists recording_votes_value_chk;
alter table public.recording_votes add constraint recording_votes_value_chk check (value in (-1, 1));

create or replace view public.recording_scores with (security_invoker = on) as
select r.id as recording_id,
       coalesce(sum(v.value), 0)::int                        as score,
       coalesce(count(*) filter (where v.value = 1), 0)::int  as ups,
       coalesce(count(*) filter (where v.value = -1), 0)::int as downs
from public.recordings r
left join public.recording_votes v on v.recording_id = r.id
group by r.id;

grant select on public.recording_scores to anon, authenticated;
