-- Garante que staff e admin possam ATUALIZAR pedidos (mudar status no Kanban).
-- Idempotente. Se a policy de UPDATE tiver se perdido no banco, o arraste do
-- Kanban falhava silenciosamente (RLS 0 linhas) e o card voltava ao status.

drop policy if exists staff_update_pedidos on public.pedidos;
create policy staff_update_pedidos on public.pedidos
  for update to authenticated
  using (
    public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'staff'::app_role)
  )
  with check (
    public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'staff'::app_role)
  );
