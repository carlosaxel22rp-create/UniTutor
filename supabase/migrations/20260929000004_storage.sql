-- =============================================================================
-- EduConnect · Migración 0004 · Storage (avatares y evidencia académica)
-- =============================================================================

-- avatars: lectura pública (fotos de la TutorCard), escritura solo en carpeta propia
-- tutor-evidence: PRIVADO (kárdex / constancias). Solo dueño y admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars',        'avatars',        true,  2097152,  array['image/jpeg','image/png','image/webp']),
  ('tutor-evidence', 'tutor-evidence', false, 5242880,  array['application/pdf'])
on conflict (id) do nothing;

-- Ruta obligatoria: {auth.uid()}/{archivo}
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatars_update_own on storage.objects
  for update to authenticated
  using      ( bucket_id = 'avatars' and owner_id = (select auth.uid())::text )
  with check ( bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text );

create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using ( bucket_id = 'avatars' and owner_id = (select auth.uid())::text );

create policy evidence_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'tutor-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_active_user())
  );

create policy evidence_read_owner_or_admin on storage.objects
  for select to authenticated
  using (
    bucket_id = 'tutor-evidence'
    and ( owner_id = (select auth.uid())::text or (select private.is_admin()) )
  );
-- Sin UPDATE/DELETE en evidencia: el documento verificado es inmutable
-- (cadena de custodia). Reemplazos = nueva solicitud.
