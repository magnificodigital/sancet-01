-- NPS pós-atendimento: resposta por link (token), sem exigir login.

-- Token por pedido (gerado quando o resultado é enviado). Link do e-mail: /nps/<token>
alter table pedidos add column if not exists nps_token uuid;
create unique index if not exists pedidos_nps_token_idx
  on pedidos(nps_token) where nps_token is not null;

create table if not exists public.nps_respostas (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id) on delete set null,
  protocolo text,
  paciente_cpf text,
  nota int not null check (nota between 0 and 10),
  comentario text,
  created_at timestamptz not null default now()
);
create unique index if not exists nps_respostas_pedido_idx
  on nps_respostas(pedido_id) where pedido_id is not null;

alter table public.nps_respostas enable row level security;
-- Sem policies diretas: acesso só via RPCs SECURITY DEFINER abaixo.

-- Config: URL base do site (para montar o link do NPS no e-mail).
insert into configuracoes (chave, valor)
values ('SITE_URL', 'https://sancet.vercel.app')
on conflict (chave) do nothing;

-- RPC pública: paciente responde o NPS pelo token (idempotente: última resposta vale).
create or replace function public.responder_nps(p_token uuid, p_nota int, p_comentario text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_ped pedidos%rowtype;
begin
  if p_nota is null or p_nota < 0 or p_nota > 10 then
    return jsonb_build_object('error', 'Nota inválida.');
  end if;
  select * into v_ped from pedidos where nps_token = p_token limit 1;
  if not found then
    return jsonb_build_object('error', 'Link inválido ou expirado.');
  end if;
  insert into nps_respostas (pedido_id, protocolo, paciente_cpf, nota, comentario)
  values (v_ped.id, v_ped.protocolo, v_ped.paciente_cpf, p_nota, nullif(btrim(p_comentario), ''))
  on conflict (pedido_id) do update
    set nota = excluded.nota, comentario = excluded.comentario, created_at = now();
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.responder_nps(uuid, int, text) to anon, authenticated;

-- RPC staff: resumo do NPS (média, distribuição, score e comentários recentes).
create or replace function public.nps_resumo()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from user_roles where user_id = auth.uid()) then
    return jsonb_build_object('error', 'Sem permissão.');
  end if;
  return (
    select jsonb_build_object(
      'total', count(*),
      'media', case when count(*) > 0 then round(avg(nota)::numeric, 1) else null end,
      'promotores', count(*) filter (where nota >= 9),
      'neutros', count(*) filter (where nota in (7, 8)),
      'detratores', count(*) filter (where nota <= 6),
      'nps', case when count(*) > 0
        then round((count(*) filter (where nota >= 9) - count(*) filter (where nota <= 6))::numeric * 100 / count(*), 0)
        else null end,
      'recentes', (
        select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
        from (
          select nota, comentario, protocolo, created_at
          from nps_respostas order by created_at desc limit 30
        ) r
      )
    )
    from nps_respostas
  );
end $$;
grant execute on function public.nps_resumo() to authenticated;
