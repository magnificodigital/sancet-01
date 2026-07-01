CREATE POLICY "Authenticated pode enviar documentos de pedidos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documentos-pedidos');