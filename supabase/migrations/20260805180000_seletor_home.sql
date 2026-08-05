-- Seletor de página inicial: marca UMA página do site como home.
-- Sem nenhuma marcada, a rota "/" usa a home funcional padrão (Index).
ALTER TABLE public.paginas ADD COLUMN IF NOT EXISTS home boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS idx_paginas_home ON public.paginas (home) WHERE home = true;

-- Página 1: Home institucional (estilo sancet.com.br)
INSERT INTO public.paginas (slug, titulo, blocos, ativa, no_menu, home)
VALUES (
  'home', 'Home institucional',
  $json$[
    {"id":"h-hero","tipo":"hero","config":{"titulo":"Tenha acesso a uma solução completa em um único local","subtitulo":"Medicina diagnóstica com acolhimento, tecnologia e qualidade.","imagem_url":"","cta_texto":"Ver exames","cta_link":"/exames","alinhamento":"centro"}},
    {"id":"h-busca","tipo":"busca_exame","config":{"titulo":"Qual exame você procura?","subtitulo":"Busque pelo nome e agende em poucos passos.","placeholder":"Digite o exame (ex: Hemograma)"}},
    {"id":"h-atalhos","tipo":"servicos","config":{"titulo_secao":"Acesso rápido","cards":[{"icone":"FileText","titulo":"Resultados de Exames","descricao":"Acesse seus resultados online.","link":"/agendamentos?aba=resultados"},{"icone":"FlaskConical","titulo":"Exames","descricao":"Veja o catálogo e agende.","link":"/exames"},{"icone":"Home","titulo":"Coleta Domiciliar","descricao":"Atendimento onde você estiver.","link":"/exames"},{"icone":"Building2","titulo":"Unidades","descricao":"Encontre a unidade mais próxima.","link":"/unidades"},{"icone":"Mail","titulo":"Fale Conosco","descricao":"Estamos prontos para ajudar.","link":"/unidades"},{"icone":"Activity","titulo":"Ultrassom","descricao":"Exames de imagem.","link":"/exames"}]}},
    {"id":"h-numeros","tipo":"estatisticas","config":{"cor_fundo":"azul","itens":[{"id":"e1","numero":"2","sufixo":"mi+","descricao":"Exames realizados"},{"id":"e2","numero":"40","sufixo":"+","descricao":"Anos de história"},{"id":"e3","numero":"1.1","sufixo":"mi","descricao":"Pacientes atendidos"},{"id":"e4","numero":"50","sufixo":"+","descricao":"Convênios aceitos"}]}},
    {"id":"h-sancetinho","tipo":"imagem-texto","config":{"titulo":"Sancetinho","texto":"Um espaço pensado para o conforto das crianças, com ambiente lúdico e atendimento carinhoso.","imagem_url":"","imagem_lado":"direita"}},
    {"id":"h-convenios","tipo":"convenios","config":{"titulo_secao":"Convênios e parceiros","logos":[]}},
    {"id":"h-cta","tipo":"cta","config":{"titulo":"Pronto para cuidar da sua saúde?","subtitulo":"Agende seus exames de forma rápida e segura.","botao_texto":"Agendar exames","botao_link":"/exames","cor_fundo":"vermelho"}}
  ]$json$::jsonb,
  true, true, false
)
ON CONFLICT (slug) DO UPDATE
  SET titulo = EXCLUDED.titulo, blocos = EXCLUDED.blocos, ativa = EXCLUDED.ativa,
      no_menu = EXCLUDED.no_menu, atualizado_em = now();

-- Página 2: Home clássica (recriação editável da home funcional atual)
INSERT INTO public.paginas (slug, titulo, blocos, ativa, no_menu, home)
VALUES (
  'inicio', 'Home clássica',
  $json$[
    {"id":"c-hero","tipo":"hero","config":{"titulo":"Seus exames com praticidade e segurança","subtitulo":"Agende online, escolha unidade ou coleta em casa e acompanhe tudo pelo protocolo.","imagem_url":"","cta_texto":"Ver exames","cta_link":"/exames","alinhamento":"centro"}},
    {"id":"c-busca","tipo":"busca_exame","config":{"titulo":"Qual exame você procura?","subtitulo":"Busque pelo nome e agende em poucos passos.","placeholder":"Digite o exame (ex: Hemograma)"}},
    {"id":"c-passos","tipo":"servicos","config":{"titulo_secao":"Como funciona","cards":[{"icone":"Search","titulo":"Escolha os exames ou vacinas","descricao":"Navegue pelo catálogo e adicione à sacola."},{"icone":"ClipboardList","titulo":"Informe seus dados","descricao":"Preencha um cadastro rápido em 4 etapas."},{"icone":"MapPin","titulo":"Escolha onde coletar","descricao":"Atendimento em unidade ou coleta em domicílio."},{"icone":"CheckCircle2","titulo":"Pronto!","descricao":"Receba o protocolo e acompanhe seu pedido."}]}},
    {"id":"c-servicos","tipo":"servicos","config":{"titulo_secao":"Nossos serviços","cards":[{"icone":"FlaskConical","titulo":"Exames laboratoriais","descricao":"Mais de 2.000 exames disponíveis.","link":"/exames"},{"icone":"Home","titulo":"Coleta em domicílio","descricao":"Comodidade e segurança onde você estiver.","link":"/exames"}]}},
    {"id":"c-unidades","tipo":"cta","config":{"titulo":"Onde nos encontrar","subtitulo":"Encontre a unidade mais próxima de você.","botao_texto":"Ver todas as unidades","botao_link":"/unidades","cor_fundo":"azul"}},
    {"id":"c-faq","tipo":"faq","config":{"titulo_secao":"Dúvidas frequentes","perguntas":[{"pergunta":"Como faço para agendar meus exames?","resposta":"Basta escolher os exames no catálogo, adicionar à sacola, preencher seus dados e confirmar o pedido. Todo o processo é feito online em poucos minutos."},{"pergunta":"Preciso de pedido médico para realizar exames?","resposta":"Depende do exame. Para convênios, normalmente sim. Para exames particulares, a maioria não exige. O sistema indica quando é necessário."},{"pergunta":"Como funciona a coleta em domicílio?","resposta":"Após o agendamento, um profissional treinado da Sancet vai até o endereço informado no horário escolhido para realizar a coleta."},{"pergunta":"Em quanto tempo recebo meu resultado?","resposta":"O prazo varia por exame — é informado na página de cada exame. A maioria dos resultados fica disponível em 24 a 48 horas."},{"pergunta":"Meu convênio é aceito?","resposta":"Trabalhamos com os principais convênios. No momento do agendamento você pode verificar se o seu plano é aceito."},{"pergunta":"Como acompanho meu pedido?","resposta":"Após confirmar o pedido você recebe um protocolo (ex: SAN-2025-000123). Acesse Meus Agendamentos a qualquer momento para acompanhar o status."}]}}
  ]$json$::jsonb,
  true, true, false
)
ON CONFLICT (slug) DO UPDATE
  SET titulo = EXCLUDED.titulo, blocos = EXCLUDED.blocos, ativa = EXCLUDED.ativa,
      no_menu = EXCLUDED.no_menu, atualizado_em = now();
