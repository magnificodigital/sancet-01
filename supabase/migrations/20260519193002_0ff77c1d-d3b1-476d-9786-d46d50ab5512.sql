WITH pares AS (
  SELECT 
    antiga.id as id_antiga,
    nova.codigo_shift as codigo_shift_correto
  FROM unidades_cache antiga
  INNER JOIN unidades_cache nova
    ON LOWER(TRIM(antiga.nome)) = LOWER(TRIM(nova.nome))
    AND antiga.id != nova.id
  WHERE antiga.codigo_shift IS NULL
    AND nova.codigo_shift IS NOT NULL
)
UPDATE unidades_cache
SET codigo_shift = pares.codigo_shift_correto,
    atualizado_em = now()
FROM pares
WHERE unidades_cache.id = pares.id_antiga;

DELETE FROM unidades_cache
WHERE id IN (
  SELECT nova.id
  FROM unidades_cache nova
  INNER JOIN unidades_cache antiga
    ON LOWER(TRIM(antiga.nome)) = LOWER(TRIM(nova.nome))
    AND antiga.id != nova.id
  WHERE antiga.codigo_shift = nova.codigo_shift
    AND nova.nome = UPPER(nova.nome)
);