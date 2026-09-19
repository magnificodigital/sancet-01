-- Métricas do dashboard (BI) agregadas no servidor, para o painel do staff.
create or replace function public.dashboard_metricas(p_dias int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dias int := greatest(coalesce(p_dias, 30), 1);
  v_ini timestamptz := now() - (v_dias || ' days')::interval;
begin
  if not exists (select 1 from user_roles where user_id = auth.uid()) then
    return jsonb_build_object('error', 'Sem permissão.');
  end if;

  return jsonb_build_object(
    'dias', v_dias,
    'total_periodo', (select count(*) from pedidos where created_at >= v_ini),
    'receita_particular_centavos', (
      select coalesce(sum(valor_total_centavos), 0) from pedidos
      where created_at >= v_ini and tipo_solicitacao = 'particular'
    ),
    'ticket_medio_centavos', (
      select coalesce(round(avg(nullif(valor_total_centavos, 0))), 0) from pedidos
      where created_at >= v_ini and tipo_solicitacao = 'particular'
    ),
    'por_dia', (
      select coalesce(jsonb_agg(to_jsonb(d) order by d.dia), '[]'::jsonb)
      from (
        select gs::date as dia,
               count(p.id) filter (where p.tipo_solicitacao = 'particular') as particular,
               count(p.id) filter (where p.tipo_solicitacao = 'convenio')  as convenio
        from generate_series(v_ini::date, now()::date, '1 day') gs
        left join pedidos p on p.created_at::date = gs::date
        group by gs::date
      ) d
    ),
    'por_unidade', (
      select coalesce(jsonb_agg(to_jsonb(u) order by u.total desc), '[]'::jsonb)
      from (
        select coalesce(nullif(btrim(unidade_nome), ''), '—') as unidade, count(*) as total
        from pedidos where created_at >= v_ini
        group by 1 order by 2 desc limit 6
      ) u
    )
  );
end $$;
grant execute on function public.dashboard_metricas(int) to authenticated;
