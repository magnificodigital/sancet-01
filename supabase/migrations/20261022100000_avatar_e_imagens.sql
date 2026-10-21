-- 1) Segurança: imagens públicas (logo, exames, avisos, avatar) só a equipe envia,
--    substitui ou apaga. As regras antigas abaixo valiam para QUALQUER usuário logado
--    (inclusive pacientes).
drop policy if exists "Staff envia imagens de exames" on storage.objects;
drop policy if exists "Staff atualiza imagens de exames" on storage.objects;
drop policy if exists "Staff remove imagens de exames" on storage.objects;
drop policy if exists imagens_exames_delete_staff on storage.objects;
create policy imagens_exames_delete_staff on storage.objects for delete to authenticated
  using (bucket_id = 'imagens-exames' and (public.has_role(auth.uid(), 'staff'::app_role) or public.has_role(auth.uid(), 'admin'::app_role)));

-- 2) Avatar do agente: "preset:<id>" (modelos prontos) ou URL de imagem enviada.
alter table public.assistente_config add column if not exists avatar text not null default 'preset:atendente';
grant select (avatar) on public.assistente_config to authenticated;
grant update (avatar) on public.assistente_config to authenticated;

create or replace function public.assistente_status()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'chat', chat_modo,
    'voz', voz_liberada,
    'nome', nome_assistente,
    'avatar', avatar,
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
