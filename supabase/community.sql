-- TaluSuri — community pronunciations, upvotes, profile pictures, and admin.
-- Run once in the Supabase SQL editor, AFTER schema.sql.
-- Prerequisite: create two PUBLIC storage buckets named 'pronunciations' and 'avatars'.

-- ── Profile pictures ────────────────────────────────────────────────
alter table public.profiles add column if not exists avatar_url text;

-- ── Admins (email allowlist) ────────────────────────────────────────
-- Readable so the client can decide whether to show the admin panel;
-- rows are only ever added/removed here in the dashboard.
create table if not exists public.admins (email text primary key);
insert into public.admins(email) values ('richard.ramcharan@pm.me') on conflict do nothing;
alter table public.admins enable row level security;
drop policy if exists "admins readable" on public.admins;
create policy "admins readable" on public.admins for select using (true);

-- True when the current authenticated user's email is in the admins table.
create or replace function public.is_admin() returns boolean language sql stable as $$
  select exists(select 1 from public.admins where email = (auth.jwt() ->> 'email'));
$$;

-- ── Recordings (one row per submitted audio clip) ───────────────────
create table if not exists public.recordings (
  id uuid primary key default gen_random_uuid(),
  word_key text not null,                  -- "<langId>|<word>"
  lang_id text not null,
  word text not null,
  user_id uuid not null references auth.users on delete cascade,
  display_name text,                        -- denormalized for display
  audio_path text not null,                 -- path within the 'pronunciations' bucket
  is_official boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.recordings enable row level security;
drop policy if exists "recordings public read"   on public.recordings;
drop policy if exists "recordings own insert"     on public.recordings;
drop policy if exists "recordings own delete"     on public.recordings;
drop policy if exists "recordings admin official" on public.recordings;
create policy "recordings public read"   on public.recordings for select using (true);
create policy "recordings own insert"     on public.recordings for insert with check (auth.uid() = user_id);
create policy "recordings own delete"     on public.recordings for delete using (auth.uid() = user_id or public.is_admin());
create policy "recordings admin official" on public.recordings for update using (public.is_admin());

-- ── Votes (one per user per recording) ──────────────────────────────
create table if not exists public.recording_votes (
  recording_id uuid not null references public.recordings on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recording_id, user_id)
);
alter table public.recording_votes enable row level security;
drop policy if exists "votes public read" on public.recording_votes;
drop policy if exists "votes own insert"   on public.recording_votes;
drop policy if exists "votes own delete"   on public.recording_votes;
create policy "votes public read" on public.recording_votes for select using (true);
create policy "votes own insert"   on public.recording_votes for insert with check (auth.uid() = user_id);
create policy "votes own delete"   on public.recording_votes for delete using (auth.uid() = user_id);

-- ── Storage policies (public read; authenticated write to own <uid>/ folder) ──
drop policy if exists "pron read"  on storage.objects;
drop policy if exists "pron write" on storage.objects;
drop policy if exists "av read"    on storage.objects;
drop policy if exists "av write"   on storage.objects;
drop policy if exists "av update"  on storage.objects;
create policy "pron read"  on storage.objects for select using (bucket_id = 'pronunciations');
create policy "pron write" on storage.objects for insert with check (bucket_id = 'pronunciations' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "av read"    on storage.objects for select using (bucket_id = 'avatars');
create policy "av write"   on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "av update"  on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
