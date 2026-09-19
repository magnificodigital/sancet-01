-- Permite tipo_documento_identidade = 'cnh' na tabela pedidos.
-- O frontend passou a oferecer CNH (frente+verso, igual RG) no lugar da
-- Certidão de Nascimento, mas a CHECK constraint antiga só aceitava
-- ('rg','certidao'), rejeitando os pedidos com 'cnh'. Mantém 'certidao'
-- para não invalidar pedidos legados já gravados.

ALTER TABLE pedidos
  DROP CONSTRAINT IF EXISTS pedidos_tipo_documento_identidade_check;

ALTER TABLE pedidos
  ADD CONSTRAINT pedidos_tipo_documento_identidade_check
  CHECK (
    tipo_documento_identidade IS NULL
    OR tipo_documento_identidade IN ('rg', 'cnh', 'certidao')
  );
