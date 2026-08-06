-- Recria as políticas de storage do bucket "imagens-exames" (upload de imagens do
-- painel: banner, hero, logos, catálogo). A política de INSERT havia sido removida
-- numa limpeza anterior, quebrando todos os uploads com "row-level security policy".

-- Garante que o bucket é público para leitura.
update storage.buckets set public = true where id = 'imagens-exames';

drop policy if exists "imagens_exames_insert_auth" on storage.objects;
create policy "imagens_exames_insert_auth"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'imagens-exames');

drop policy if exists "imagens_exames_update_auth" on storage.objects;
create policy "imagens_exames_update_auth"
  on storage.objects for update to authenticated
  using (bucket_id = 'imagens-exames')
  with check (bucket_id = 'imagens-exames');

drop policy if exists "imagens_exames_select_public" on storage.objects;
create policy "imagens_exames_select_public"
  on storage.objects for select to public
  using (bucket_id = 'imagens-exames');
