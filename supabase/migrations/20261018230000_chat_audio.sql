-- Chat: mensagens de áudio (paciente e equipe), transcrição e resposta da IA em áudio.

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif', 'application/pdf',
                               'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-m4a', 'audio/aac']
where id = 'chat-anexos';

alter table public.assistente_config
  add column if not exists audio_paciente boolean not null default true,
  add column if not exists audio_responder_com_audio boolean not null default true,
  add column if not exists audio_max_seg int not null default 180 check (audio_max_seg between 15 and 600);
grant select (audio_paciente, audio_responder_com_audio, audio_max_seg) on public.assistente_config to authenticated;
grant update (audio_paciente, audio_responder_com_audio, audio_max_seg) on public.assistente_config to authenticated;

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
    'atendente', coalesce((habilidades->>'atendente')::boolean, true),
    'audio', audio_paciente,
    'audio_max_seg', audio_max_seg
  ) from public.assistente_config where id = 1;
$$;
grant execute on function public.assistente_status() to anon, authenticated;
