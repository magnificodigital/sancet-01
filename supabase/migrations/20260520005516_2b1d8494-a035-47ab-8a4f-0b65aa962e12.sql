DROP POLICY IF EXISTS admin_delete_unidades ON unidades_cache;
CREATE POLICY admin_delete_unidades ON unidades_cache
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));