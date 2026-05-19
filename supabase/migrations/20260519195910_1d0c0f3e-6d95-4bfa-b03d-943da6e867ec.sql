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
WHERE nome = UPPER(nome)
  AND codigo_shift IN (
    SELECT codigo_shift FROM unidades_cache
    WHERE codigo_shift IS NOT NULL
    GROUP BY codigo_shift
    HAVING COUNT(*) > 1
  );