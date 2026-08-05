-- Move a home institucional para "Páginas do site" (tabela paginas), slug "home".
-- Remove a versão anterior em landing_pages, se existir.
DELETE FROM public.landing_pages WHERE slug = 'home';

INSERT INTO public.paginas (slug, titulo, blocos, ativa, no_menu)
VALUES (
  'home',
  'Home',
  $json$[
    {
      "id": "b-hero",
      "tipo": "hero",
      "config": {
        "titulo": "Tenha acesso a uma solução completa em um único local",
        "subtitulo": "Medicina diagnóstica com acolhimento, tecnologia e qualidade.",
        "imagem_url": "",
        "cta_texto": "Ver exames",
        "cta_link": "/exames",
        "alinhamento": "centro"
      }
    },
    {
      "id": "b-busca",
      "tipo": "busca_exame",
      "config": {
        "titulo": "Qual exame você procura?",
        "subtitulo": "Busque pelo nome e agende em poucos passos.",
        "placeholder": "Digite o exame (ex: Hemograma)"
      }
    },
    {
      "id": "b-atalhos",
      "tipo": "servicos",
      "config": {
        "titulo_secao": "Acesso rápido",
        "cards": [
          { "icone": "FileText", "titulo": "Resultados de Exames", "descricao": "Acesse seus resultados online.", "link": "/agendamentos?aba=resultados" },
          { "icone": "FlaskConical", "titulo": "Exames", "descricao": "Veja o catálogo e agende.", "link": "/exames" },
          { "icone": "Home", "titulo": "Coleta Domiciliar", "descricao": "Atendimento onde você estiver.", "link": "/exames" },
          { "icone": "Building2", "titulo": "Unidades", "descricao": "Encontre a unidade mais próxima.", "link": "/unidades" },
          { "icone": "Mail", "titulo": "Fale Conosco", "descricao": "Estamos prontos para ajudar.", "link": "/unidades" },
          { "icone": "Activity", "titulo": "Ultrassom", "descricao": "Exames de imagem.", "link": "/exames" }
        ]
      }
    },
    {
      "id": "b-numeros",
      "tipo": "estatisticas",
      "config": {
        "cor_fundo": "azul",
        "itens": [
          { "id": "e1", "numero": "2", "sufixo": "mi+", "descricao": "Exames realizados" },
          { "id": "e2", "numero": "40", "sufixo": "+", "descricao": "Anos de história" },
          { "id": "e3", "numero": "1.1", "sufixo": "mi", "descricao": "Pacientes atendidos" },
          { "id": "e4", "numero": "50", "sufixo": "+", "descricao": "Convênios aceitos" }
        ]
      }
    },
    {
      "id": "b-sancetinho",
      "tipo": "imagem-texto",
      "config": {
        "titulo": "Sancetinho",
        "texto": "Um espaço pensado para o conforto das crianças, com ambiente lúdico e atendimento carinhoso — para que o exame seja tranquilo para os pequenos e para a família.",
        "imagem_url": "",
        "imagem_lado": "direita"
      }
    },
    {
      "id": "b-convenios",
      "tipo": "convenios",
      "config": {
        "titulo_secao": "Convênios e parceiros",
        "logos": []
      }
    },
    {
      "id": "b-cta",
      "tipo": "cta",
      "config": {
        "titulo": "Pronto para cuidar da sua saúde?",
        "subtitulo": "Agende seus exames de forma rápida e segura.",
        "botao_texto": "Agendar exames",
        "botao_link": "/exames",
        "cor_fundo": "vermelho"
      }
    }
  ]$json$::jsonb,
  true,
  true
)
ON CONFLICT (slug) DO UPDATE
  SET titulo = EXCLUDED.titulo,
      blocos = EXCLUDED.blocos,
      ativa = EXCLUDED.ativa,
      no_menu = EXCLUDED.no_menu,
      atualizado_em = now();
