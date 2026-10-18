-- Assistente virtual: configurações completas (aparência do chat, comportamento
-- da IA, base de conhecimento, habilidades, atendimento humano, voz e
-- respostas rápidas da equipe). Liberação continua só com o admin master.

alter table public.assistente_config
  -- Aparência / widget
  add column if not exists nome_assistente text not null default 'Assistente Sancet',
  add column if not exists boas_vindas text,
  add column if not exists texto_botao text not null default 'Fale com a Sancet',
  add column if not exists posicao text not null default 'direita' check (posicao in ('direita', 'esquerda')),
  add column if not exists cor_widget text check (cor_widget is null or cor_widget ~ '^#[0-9a-fA-F]{6}$'),
  add column if not exists abrir_auto_seg int not null default 0 check (abrir_auto_seg between 0 and 600),
  add column if not exists sugestoes jsonb not null default
    '["Quanto custa um exame?", "Qual o preparo do meu exame?", "Quero agendar exames", "Unidades e horários", "Vocês aceitam meu convênio?"]'::jsonb,
  add column if not exists paginas_ocultas jsonb not null default '[]'::jsonb,
  -- Comportamento da IA
  add column if not exists chat_modelo text not null default 'google/gemini-2.5-flash',
  add column if not exists tom text not null default 'acolhedor' check (tom in ('acolhedor', 'formal', 'descontraido')),
  add column if not exists tamanho_resposta text not null default 'curta' check (tamanho_resposta in ('curta', 'media', 'detalhada')),
  add column if not exists usar_emojis boolean not null default true,
  add column if not exists faq jsonb not null default '[]'::jsonb,
  add column if not exists habilidades jsonb not null default
    '{"precos": true, "preparo": true, "unidades": true, "convenios": true, "datas": true, "pedidos": true, "agendar": true, "anexos": true, "atendente": true}'::jsonb,
  add column if not exists limite_msgs_hora int not null default 60 check (limite_msgs_hora between 5 and 500),
  -- Atendimento humano
  add column if not exists humano_horario jsonb not null default
    '{"1": {"inicio": "07:00", "fim": "18:00"}, "2": {"inicio": "07:00", "fim": "18:00"}, "3": {"inicio": "07:00", "fim": "18:00"}, "4": {"inicio": "07:00", "fim": "18:00"}, "5": {"inicio": "07:00", "fim": "18:00"}, "6": {"inicio": "07:00", "fim": "12:00"}}'::jsonb,
  add column if not exists fora_horario_acao text not null default 'fila' check (fora_horario_acao in ('fila', 'ia')),
  add column if not exists msg_chamar_atendente text,
  add column if not exists msg_fora_horario text,
  add column if not exists msg_encerramento text,
  add column if not exists notificar_email boolean not null default false,
  add column if not exists emails_notificacao text,
  add column if not exists respostas_rapidas jsonb not null default '[]'::jsonb,
  -- Voz
  add column if not exists voz_velocidade numeric(3, 2) not null default 1.0 check (voz_velocidade between 0.5 and 1.5),
  add column if not exists voz_paciencia text not null default 'auto' check (voz_paciencia in ('low', 'medium', 'high', 'auto'));

grant select (nome_assistente, boas_vindas, texto_botao, posicao, cor_widget, abrir_auto_seg, sugestoes, paginas_ocultas,
              chat_modelo, tom, tamanho_resposta, usar_emojis, faq, habilidades, limite_msgs_hora,
              humano_horario, fora_horario_acao, msg_chamar_atendente, msg_fora_horario, msg_encerramento,
              notificar_email, emails_notificacao, respostas_rapidas, voz_velocidade, voz_paciencia)
  on public.assistente_config to authenticated;
grant update (nome_assistente, boas_vindas, texto_botao, posicao, cor_widget, abrir_auto_seg, sugestoes, paginas_ocultas,
              chat_modelo, tom, tamanho_resposta, usar_emojis, faq, habilidades, limite_msgs_hora,
              humano_horario, fora_horario_acao, msg_chamar_atendente, msg_fora_horario, msg_encerramento,
              notificar_email, emails_notificacao, respostas_rapidas, voz_velocidade, voz_paciencia)
  on public.assistente_config to authenticated;

-- Respostas rápidas também para a equipe (não só admins) usar no chat.
create or replace function public.chat_respostas_rapidas()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.chat_eh_equipe() then respostas_rapidas else '[]'::jsonb end
  from public.assistente_config where id = 1;
$$;
revoke all on function public.chat_respostas_rapidas() from public, anon;
grant execute on function public.chat_respostas_rapidas() to authenticated;

-- Site público: modo, voz e aparência do chat (nada sensível).
create or replace function public.assistente_status()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'chat', chat_modo,
    'voz', voz_liberada,
    'nome', nome_assistente,
    'boas_vindas', boas_vindas,
    'texto_botao', texto_botao,
    'posicao', posicao,
    'cor', cor_widget,
    'abrir_auto_seg', abrir_auto_seg,
    'sugestoes', sugestoes,
    'paginas_ocultas', paginas_ocultas,
    'anexos', coalesce((habilidades->>'anexos')::boolean, true),
    'atendente', coalesce((habilidades->>'atendente')::boolean, true)
  ) from public.assistente_config where id = 1;
$$;
grant execute on function public.assistente_status() to anon, authenticated;

-- Encerramento usa a mensagem configurada.
create or replace function public.chat_encerrar(_conversa uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.chat_conversas; v_msg text;
begin
  select * into c from public.chat_conversas where id = _conversa for update;
  if not found then raise exception 'Conversa não encontrada.'; end if;
  if not public.chat_pode_mexer(c) then raise exception 'Só o responsável ou um admin pode encerrar.' using errcode = '42501'; end if;
  select coalesce(nullif(trim(msg_encerramento), ''), 'Atendimento encerrado. Se precisar de algo, é só escrever aqui. 😊')
    into v_msg from public.assistente_config where id = 1;
  update public.chat_conversas set status = 'encerrada', ia_ativa = true, nao_lidas = 0 where id = _conversa;
  insert into public.chat_mensagens (conversa_id, autor, texto, meta)
  values (_conversa, 'sistema', v_msg, jsonb_build_object('publico', true, 'evento', 'encerrada', 'por', auth.uid()));
end $$;
