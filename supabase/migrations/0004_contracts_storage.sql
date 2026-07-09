-- 0004_contracts_storage.sql — private "contracts" Storage bucket + owner-only object RLS.
-- Path convention: <user_id>/<contract_id>.pdf, so foldername(name)[1] is the owner's uid.
-- Belt-and-suspenders: the bucket also caps size (10MB) and mime (application/pdf).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contracts', 'contracts', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---- Owner-only object access: first path segment must equal the caller's uid. ----
drop policy if exists "contracts_objects_select_own" on storage.objects;
create policy "contracts_objects_select_own" on storage.objects
  for select using (
    bucket_id = 'contracts' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "contracts_objects_insert_own" on storage.objects;
create policy "contracts_objects_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'contracts' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "contracts_objects_update_own" on storage.objects;
create policy "contracts_objects_update_own" on storage.objects
  for update using (
    bucket_id = 'contracts' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'contracts' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "contracts_objects_delete_own" on storage.objects;
create policy "contracts_objects_delete_own" on storage.objects
  for delete using (
    bucket_id = 'contracts' and (storage.foldername(name))[1] = auth.uid()::text
  );
