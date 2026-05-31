-- TaluSuri — self-service account deletion ("vergeet mij").
-- Run once in the Supabase SQL editor, AFTER community.sql.
--
-- A client with the anon key cannot delete its own auth.users row, and there is no
-- DELETE policy on storage.objects — so the client first removes its own storage files
-- (via the policies below), then calls delete_own_account() to drop the auth user, whose
-- ON DELETE CASCADE wipes the matching profiles, recordings and recording_votes rows.

-- ── Let users delete their own files (folder named by their uid) ─────
drop policy if exists "pron delete" on storage.objects;
drop policy if exists "av delete"   on storage.objects;
create policy "pron delete" on storage.objects for delete
  using (bucket_id = 'pronunciations' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "av delete"   on storage.objects for delete
  using (bucket_id = 'avatars'        and auth.uid()::text = (storage.foldername(name))[1]);

-- ── Delete the calling user's own account ───────────────────────────
-- security definer so it can touch auth.users; only ever acts on auth.uid(), so a user
-- can only ever delete themselves. Storage blobs are removed client-side first via the
-- storage API (Supabase forbids direct DELETE on storage.objects from SQL), so this only
-- drops the auth user — whose ON DELETE CASCADE clears profiles, recordings and votes.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = uid;   -- cascades profiles, recordings, recording_votes
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
