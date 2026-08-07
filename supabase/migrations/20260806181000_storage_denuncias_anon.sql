-- Permite upload anônimo de anexos de denúncia, restrito à pasta "denuncias/"
-- do bucket privado documentos-pedidos. Leitura continua restrita (links assinados
-- são gerados pela função sancet-denuncia).
drop policy if exists "denuncias_anon_insert" on storage.objects;
create policy "denuncias_anon_insert"
  on storage.objects for insert to anon
  with check (
    bucket_id = 'documentos-pedidos'
    and (storage.foldername(name))[1] = 'denuncias'
  );
