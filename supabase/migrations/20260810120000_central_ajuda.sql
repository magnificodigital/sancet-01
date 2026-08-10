-- Central de Ajuda (interna): tutoriais de uso da plataforma para a equipe.
-- Conteúdo é sobre COMO USAR o sistema — não é público (não expor no site).
create table if not exists public.tutoriais (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null,
  categoria text,
  ordem integer not null default 0,
  resumo text,
  conteudo_html text not null default '',
  publicado boolean not null default true,
  atualizado_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);
create index if not exists idx_tutoriais_categoria on public.tutoriais (categoria);
create index if not exists idx_tutoriais_ordem on public.tutoriais (categoria, ordem);

alter table public.tutoriais enable row level security;

-- Interno: nada de anon. Só usuários autenticados (staff/admin) leem; só admin escreve.
grant select on public.tutoriais to authenticated;
grant insert, update, delete on public.tutoriais to authenticated;

-- Leitura: staff ou admin.
drop policy if exists "tutoriais_select" on public.tutoriais;
create policy "tutoriais_select" on public.tutoriais for select to authenticated
  using (
    public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'staff'::app_role)
  );

-- Escrita: só admin (edição dos tutoriais é função administrativa).
drop policy if exists "tutoriais_write" on public.tutoriais;
create policy "tutoriais_write" on public.tutoriais for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

-- Tutoriais iniciais (exemplos editáveis). Não sobrescreve se já existir o slug.
insert into public.tutoriais (slug, titulo, categoria, ordem, resumo, conteudo_html) values
(
  'primeiros-passos',
  'Primeiros passos no painel',
  'Primeiros passos', 0,
  'Visão geral do painel interno e onde fica cada coisa.',
  '<p>Bem-vindo ao painel interno. No menu à esquerda você encontra:</p><ul><li><strong>Visão Geral</strong> — resumo do dia.</li><li><strong>Pedidos</strong> — todos os agendamentos, em lista ou Kanban.</li><li><strong>Check-in</strong> — leitura do QR na recepção.</li><li><strong>Pacientes, Catálogo, Unidades, Convênios</strong> — dados de cadastro.</li><li><strong>Configurações</strong> — cores, logo, e-mail e sincronização do Shift.</li></ul><p>Dúvidas sobre uma tela específica? Procure o tutorial dela aqui na Central de Ajuda.</p>'
),
(
  'gerenciar-pedidos-kanban',
  'Como gerenciar pedidos no Kanban',
  'Pedidos & CRM', 0,
  'Mover pedidos entre etapas e acompanhar o que está pendente.',
  '<p>Em <strong>Pedidos</strong>, use o botão de alternância para ver a lista ou o <strong>Kanban</strong>.</p><ol><li>Cada cartão é um pedido. Arraste entre as colunas para mudar o status.</li><li>O contador no topo mostra quantos estão em cada etapa.</li><li>Clique em um cartão para ver os detalhes e os documentos enviados.</li></ol><p>O selo vermelho no menu indica pedidos novos aguardando atendimento.</p>'
),
(
  'sincronizar-shift',
  'Como sincronizar o catálogo com o Shift',
  'Integrações', 0,
  'Atualizar exames, unidades e convênios a partir do Shift.',
  '<p>A sincronização com o Shift fica em <strong>Configurações</strong> (acesso de administrador).</p><ol><li>Abra <strong>Configurações → Sync Shift</strong>.</li><li>Escolha o que sincronizar (exames, unidades, convênios).</li><li>Aguarde a confirmação. O catálogo do site é atualizado automaticamente.</li></ol><p>Faça a sincronização fora do horário de pico para não concorrer com o atendimento.</p>'
),
(
  'editar-paginas-site',
  'Como editar as páginas do site',
  'Site & páginas', 0,
  'Alterar textos, blocos e a página inicial pelo construtor.',
  '<p>Em <strong>Sites → Páginas do site</strong> você edita as páginas com o construtor de blocos.</p><ol><li>Abra a página desejada e adicione ou reordene os blocos.</li><li>Para trocar a página inicial, marque a estrela na página que deseja como Home.</li><li>Salve — as mudanças vão ao ar na hora.</li></ol><p>As cores, o logo e o rodapé ficam em <strong>Configurações → Aparência</strong>.</p>'
)
on conflict (slug) do nothing;
