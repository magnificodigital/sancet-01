-- Paciente reagenda o próprio pedido (menu "Reagendar" / detalhe do pedido).
-- Regras: só pedidos na unidade, ainda não atendidos; mesma antecedência da
-- agenda (dois dias livres; após 16h conta como o dia seguinte) e até 30 dias.
-- Pedido já confirmado volta para "em análise" para a equipe confirmar a nova data.

alter table pedidos add column if not exists reagendado_em timestamptz;
alter table pedidos add column if not exists reagendado_de text;

create or replace function public.reagendar_meu_pedido_auth(p_protocolo text, p_data date, p_periodo text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_ped pedidos%rowtype;
  v_agora timestamp := now() at time zone 'America/Sao_Paulo';
  v_min date;
begin
  select p.* into v_ped
  from pedidos p join pacientes pa on pa.id = p.paciente_id
  where p.protocolo = p_protocolo and pa.auth_user_id = auth.uid()
  limit 1;
  if v_ped.id is null then
    return jsonb_build_object('error', 'Pedido não encontrado.');
  end if;
  if v_ped.status not in ('novo', 'em_analise', 'aguardando_pagamento', 'confirmado')
     or coalesce(v_ped.modalidade_coleta, 'unidade') = 'domicilio' then
    return jsonb_build_object('error', 'Este pedido não pode ser reagendado pelo site. Fale com a recepção.');
  end if;
  if p_periodo not in ('manha', 'tarde') then
    return jsonb_build_object('error', 'Período inválido.');
  end if;

  v_min := v_agora::date + 3 + case when extract(hour from v_agora) >= 16 then 1 else 0 end;
  if p_data is null or p_data < v_min or p_data > v_agora::date + 30 then
    return jsonb_build_object('error', 'Escolha uma data a partir de ' || to_char(v_min, 'DD/MM') || '.');
  end if;

  update pedidos set
    reagendado_de = coalesce(to_char(data_agendamento, 'DD/MM/YYYY'), '—') || ' ' ||
                    case periodo_agendamento when 'manha' then 'Manhã' when 'tarde' then 'Tarde' else '' end,
    data_agendamento = p_data,
    periodo_agendamento = p_periodo,
    reagendado_em = now(),
    status = case when status = 'confirmado' then 'em_analise' else status end,
    updated_at = now()
  where id = v_ped.id;

  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.reagendar_meu_pedido_auth(text, date, text) from public, anon;
grant execute on function public.reagendar_meu_pedido_auth(text, date, text) to authenticated;
