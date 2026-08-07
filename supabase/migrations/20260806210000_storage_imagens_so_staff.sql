-- Aperta o upload do bucket imagens-exames: apenas STAFF/ADMIN podem enviar/atualizar.
-- (Antes era qualquer usuário autenticado, o que incluía pacientes.)
-- Leitura pública permanece (bucket público + policy select).

drop policy if exists "imagens_exames_insert_auth" on storage.objects;
drop policy if exists "imagens_exames_insert_staff" on storage.objects;
create policy "imagens_exames_insert_staff"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'imagens-exames'
    and (
      public.has_role(auth.uid(), 'staff'::app_role)
      or public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

drop policy if exists "imagens_exames_update_auth" on storage.objects;
drop policy if exists "imagens_exames_update_staff" on storage.objects;
create policy "imagens_exames_update_staff"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'imagens-exames'
    and (
      public.has_role(auth.uid(), 'staff'::app_role)
      or public.has_role(auth.uid(), 'admin'::app_role)
    )
  )
  with check (
    bucket_id = 'imagens-exames'
    and (
      public.has_role(auth.uid(), 'staff'::app_role)
      or public.has_role(auth.uid(), 'admin'::app_role)
    )
  );
