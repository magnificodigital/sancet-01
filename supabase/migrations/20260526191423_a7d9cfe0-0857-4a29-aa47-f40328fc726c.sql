DROP POLICY IF EXISTS anon_insert_documentos_pedidos ON storage.objects;
CREATE POLICY anon_insert_documentos_pedidos ON storage.objects
FOR INSERT TO anon
WITH CHECK (bucket_id = 'documentos-pedidos');

GRANT INSERT ON storage.objects TO anon;