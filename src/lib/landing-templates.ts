import type { Bloco } from "@/components/landing/tipos";
import { uid } from "@/components/landing/tipos";

export type LandingTemplate = {
  id: string;
  nome: string;
  descricao: string;
  thumbnail_gradient: string;
  cor_principal: string;
  blocos: () => Bloco[];
};

const outubroRosa = (): Bloco[] => [
  {
    id: uid(),
    tipo: "hero",
    config: {
      titulo: "Outubro Rosa Sancet",
      subtitulo: "Cuidar de você é o primeiro passo para uma vida saudável.",
      imagem_url: "",
      cta_texto: "Agendar meus exames",
      cta_link: "#agendar",
      alinhamento: "centro",
    },
  },
  {
    id: uid(),
    tipo: "estatisticas",
    config: {
      cor_fundo: "branco",
      itens: [
        { id: uid(), numero: "1", sufixo: " em 12", descricao: "mulheres terão câncer de mama na vida" },
        { id: uid(), numero: "95", sufixo: "%", descricao: "de chance de cura com diagnóstico precoce" },
        { id: uid(), numero: "40", sufixo: "+", descricao: "idade ideal para iniciar a mamografia" },
        { id: uid(), numero: "30", sufixo: " anos", descricao: "Sancet ao seu lado cuidando da sua saúde" },
      ],
    },
  },
  {
    id: uid(),
    tipo: "texto",
    config: {
      titulo: "Por que se prevenir?",
      conteudo:
        "O câncer de mama é o tipo de câncer mais comum entre as mulheres no Brasil, depois do câncer de pele não melanoma. A boa notícia é que, quando descoberto cedo, as chances de cura ultrapassam 95%.\n\nA prevenção começa pelo autocuidado: conhecer o próprio corpo, manter hábitos saudáveis e realizar consultas e exames de rotina. Pequenas atitudes salvam vidas.\n\nNa Sancet você encontra uma estrutura completa de exames, equipe especializada e um atendimento acolhedor para acompanhar você em todas as etapas dessa jornada.",
    },
  },
  {
    id: uid(),
    tipo: "exames_destaque",
    config: {
      titulo_secao: "Exames recomendados nesta campanha",
      subtitulo_secao: "Selecione os exames recomendados (ex: CA 15-3, CA 27.29, CEA, Hemograma)",
      exames_ids: [],
      mostrar_botao_carrinho: true,
    },
  },
  {
    id: uid(),
    tipo: "imagem-texto",
    config: {
      titulo: "Quem deve fazer e quando",
      texto:
        "A recomendação geral é iniciar a mamografia a partir dos 40 anos, com periodicidade anual. Mulheres com histórico familiar devem antecipar o início do rastreamento e conversar com o médico sobre a frequência ideal.\n\nO autoexame deve ser feito mensalmente, e a consulta clínica anual é parte essencial da rotina de cuidados.",
      imagem_url: "",
      imagem_lado: "direita",
    },
  },
  {
    id: uid(),
    tipo: "depoimentos",
    config: {
      titulo_secao: "Histórias que inspiram",
      subtitulo_secao: "Mulheres que escolheram se cuidar",
      depoimentos: [
        { id: uid(), foto_url: "", nome: "Cláudia M.", texto: "Descobri cedo graças a um exame de rotina. Hoje sou grata por ter feito.", estrelas: 5 },
        { id: uid(), foto_url: "", nome: "Renata P.", texto: "Atendimento humano e acolhedor em um momento delicado. Recomendo.", estrelas: 5 },
        { id: uid(), foto_url: "", nome: "Beatriz L.", texto: "Equipe maravilhosa, processo rápido e resultado em poucos dias.", estrelas: 5 },
      ],
    },
  },
  {
    id: uid(),
    tipo: "faq",
    config: {
      titulo_secao: "Perguntas frequentes",
      perguntas: [
        { pergunta: "Quais exames são recomendados na campanha?", resposta: "Mamografia, ultrassonografia mamária e marcadores tumorais como CA 15-3 são os mais comuns. Seu médico definirá o painel ideal." },
        { pergunta: "A partir de que idade devo fazer a mamografia?", resposta: "A recomendação geral é a partir dos 40 anos, anualmente. Mulheres com histórico familiar devem iniciar antes." },
        { pergunta: "Preciso de pedido médico?", resposta: "Para exames pelo convênio, sim. Em caráter particular, alguns exames podem ser realizados sem pedido — consulte a unidade." },
        { pergunta: "Quanto tempo demora o resultado?", resposta: "A maioria dos exames fica pronta em até 5 dias úteis. Você pode acompanhar pelo nosso portal." },
      ],
    },
  },
  {
    id: uid(),
    tipo: "cta",
    config: {
      titulo: "Agende hoje seu check-up",
      subtitulo: "Cuide de você. Sua saúde merece prioridade.",
      botao_texto: "Falar com a Sancet",
      botao_link: "#contato",
      cor_fundo: "vermelho",
    },
  },
  {
    id: uid(),
    tipo: "convenios",
    config: { titulo_secao: "Aceitamos os principais convênios", logos: [] },
  },
];

const novembroAzul = (): Bloco[] => [
  {
    id: uid(),
    tipo: "hero",
    config: {
      titulo: "Novembro Azul Sancet",
      subtitulo: "Homens também se cuidam. Faça seu check-up.",
      imagem_url: "",
      cta_texto: "Quero me prevenir",
      cta_link: "#agendar",
      alinhamento: "centro",
    },
  },
  {
    id: uid(),
    tipo: "estatisticas",
    config: {
      cor_fundo: "azul",
      itens: [
        { id: uid(), numero: "1", sufixo: " em 8", descricao: "homens terão câncer de próstata" },
        { id: uid(), numero: "50", sufixo: "+", descricao: "idade recomendada para iniciar o PSA" },
        { id: uid(), numero: "90", sufixo: "%", descricao: "de curabilidade no diagnóstico precoce" },
        { id: uid(), numero: "20", sufixo: "", descricao: "unidades Sancet prontas para te atender" },
      ],
    },
  },
  {
    id: uid(),
    tipo: "texto",
    config: {
      titulo: "Quebre o silêncio",
      conteudo:
        "O câncer de próstata é o segundo mais comum entre os homens brasileiros. Apesar disso, muitos ainda evitam falar sobre o tema ou adiam a ida ao médico — e esse silêncio custa vidas.\n\nA prevenção é simples: exames anuais a partir dos 50 anos (ou 45, se houver histórico familiar) podem identificar alterações no início, quando as chances de cura são altíssimas.\n\nNovembro Azul é o convite para cuidar de você. Sua família, seus amigos e seu corpo agradecem.",
    },
  },
  {
    id: uid(),
    tipo: "exames_destaque",
    config: {
      titulo_secao: "Check-up masculino completo",
      subtitulo_secao: "Selecione os exames (ex: PSA total, PSA livre, Testosterona, Glicemia, Colesterol total)",
      exames_ids: [],
      mostrar_botao_carrinho: true,
    },
  },
  {
    id: uid(),
    tipo: "imagem-texto",
    config: {
      titulo: "A partir dos 50 anos (ou 45 com histórico familiar)",
      texto:
        "A recomendação atual é que homens iniciem o rastreamento anual aos 50 anos. Quando há histórico familiar de câncer de próstata, esse início deve ser antecipado para os 45 anos.\n\nO exame de PSA é simples, rápido e essencial. Combinado com a consulta urológica, forma a base da prevenção masculina.",
      imagem_url: "",
      imagem_lado: "esquerda",
    },
  },
  {
    id: uid(),
    tipo: "depoimentos",
    config: {
      titulo_secao: "Eles cuidaram. Você também pode.",
      subtitulo_secao: "",
      depoimentos: [
        { id: uid(), foto_url: "", nome: "Ricardo A.", texto: "Fiz o check-up por insistência da minha esposa. Hoje agradeço todo dia.", estrelas: 5 },
        { id: uid(), foto_url: "", nome: "Eduardo S.", texto: "Atendimento profissional e sem julgamentos. Recomendo a todos os homens.", estrelas: 5 },
        { id: uid(), foto_url: "", nome: "Marcelo T.", texto: "Rápido, prático e com resultado em poucos dias. Vou todo ano agora.", estrelas: 5 },
      ],
    },
  },
  {
    id: uid(),
    tipo: "faq",
    config: {
      titulo_secao: "Perguntas frequentes",
      perguntas: [
        { pergunta: "O check-up é só PSA?", resposta: "Não. O PSA é parte essencial, mas o check-up completo inclui hemograma, glicemia, colesterol, função renal e hepática, entre outros." },
        { pergunta: "Preciso de pedido médico?", resposta: "Para exames pelo convênio, sim. Em caráter particular, vários exames podem ser feitos sem pedido — consulte a unidade." },
        { pergunta: "Posso fazer com convênio?", resposta: "Sim, atendemos os principais convênios. Confira a lista nesta página." },
        { pergunta: "E se eu tiver alterações no exame?", resposta: "Alterações no PSA não significam câncer. Procure um urologista para uma avaliação completa — estamos aqui para apoiar." },
      ],
    },
  },
  {
    id: uid(),
    tipo: "cta",
    config: {
      titulo: "Não deixe para depois",
      subtitulo: "Sua saúde é o melhor presente para quem ama você.",
      botao_texto: "Agendar agora",
      botao_link: "#contato",
      cor_fundo: "azul",
    },
  },
  {
    id: uid(),
    tipo: "convenios",
    config: { titulo_secao: "Aceitamos os principais convênios", logos: [] },
  },
];

const checkupAnual = (): Bloco[] => [
  {
    id: uid(),
    tipo: "hero",
    config: {
      titulo: "Seu check-up anual em um só lugar",
      subtitulo: "Cuidar da saúde começa por conhecer seu corpo. Escolha o pacote ideal para sua fase.",
      imagem_url: "",
      cta_texto: "Ver pacotes",
      cta_link: "#pacotes",
      alinhamento: "centro",
    },
  },
  {
    id: uid(),
    tipo: "estatisticas",
    config: {
      cor_fundo: "cinza",
      itens: [
        { id: uid(), numero: "30", sufixo: " anos", descricao: "Sancet ao seu lado" },
        { id: uid(), numero: "50", sufixo: "+", descricao: "exames disponíveis em cada perfil" },
        { id: uid(), numero: "20", sufixo: "", descricao: "unidades para sua conveniência" },
        { id: uid(), numero: "98", sufixo: "%", descricao: "dos pedidos com resultado em até 48h" },
      ],
    },
  },
  {
    id: uid(),
    tipo: "texto",
    config: {
      titulo: "Por que fazer check-up todo ano?",
      conteudo:
        "Prevenir é sempre mais simples — e mais barato — do que tratar. Um check-up anual permite identificar pequenas alterações antes que elas se tornem problemas maiores, evitando tratamentos longos e custosos no futuro.\n\nMuitas doenças crônicas são silenciosas: pressão alta, colesterol elevado, alterações de tireoide e até alguns tipos de câncer não causam sintomas no início. Só os exames revelam o que o corpo ainda não conseguiu mostrar.\n\nFazer um check-up todos os anos cria um histórico da sua saúde, e é justamente esse acompanhamento que permite ao médico agir cedo, manter você saudável por mais tempo e dar mais qualidade aos seus anos de vida.",
    },
  },
  {
    id: uid(),
    tipo: "servicos",
    config: {
      titulo_secao: "Escolha seu perfil",
      cards: [
        { icone: "Sparkles", titulo: "Essencial — até 30 anos", descricao: "Hemograma, glicemia, perfil lipídico, vitaminas. Ideal para jovens adultos sem queixas." },
        { icone: "Shield", titulo: "Completo — 30 a 50 anos", descricao: "Tudo do Essencial + função renal, hepática, tireoide, marcadores cardíacos básicos." },
        { icone: "Crown", titulo: "Premium — 50+ anos", descricao: "Pacote completo com marcadores tumorais, hormônios, vitaminas, função cardíaca avançada." },
      ],
    },
  },
  {
    id: uid(),
    tipo: "exames_destaque",
    config: {
      titulo_secao: "Check-up Essencial — até 30 anos",
      subtitulo_secao: "Exames básicos para acompanhar quem tem rotina saudável",
      exames_ids: [],
      mostrar_botao_carrinho: true,
    },
  },
  {
    id: uid(),
    tipo: "exames_destaque",
    config: {
      titulo_secao: "Check-up Completo — 30 a 50 anos",
      subtitulo_secao: "Para quem quer monitorar a saúde com mais profundidade",
      exames_ids: [],
      mostrar_botao_carrinho: true,
    },
  },
  {
    id: uid(),
    tipo: "exames_destaque",
    config: {
      titulo_secao: "Check-up Premium — 50+ anos",
      subtitulo_secao: "Avaliação completa com marcadores tumorais e hormonais",
      exames_ids: [],
      mostrar_botao_carrinho: true,
    },
  },
  {
    id: uid(),
    tipo: "imagem-texto",
    config: {
      titulo: "Como funciona",
      texto:
        "1. Escolha seu pacote acima.\n2. Faça o pedido pelo site sem sair de casa.\n3. Compareça em qualquer uma das 20 unidades Sancet em jejum.\n4. Receba o resultado em até 48h pelo seu portal.",
      imagem_url: "",
      imagem_lado: "direita",
    },
  },
  {
    id: uid(),
    tipo: "depoimentos",
    config: {
      titulo_secao: "Quem fez recomenda",
      subtitulo_secao: "",
      depoimentos: [
        { id: uid(), foto_url: "", nome: "Lucas, 28 anos", texto: "Faço meu check-up todo ano na Sancet. Rápido, prático e o resultado sai em 2 dias.", estrelas: 5 },
        { id: uid(), foto_url: "", nome: "Patrícia, 42 anos", texto: "Descobri uma alteração de tireoide bem no início. Hoje está tudo controlado graças ao acompanhamento.", estrelas: 5 },
        { id: uid(), foto_url: "", nome: "Antônio, 64 anos", texto: "Atendimento atencioso e equipe que me trata pelo nome. Recomendo para minha família toda.", estrelas: 5 },
      ],
    },
  },
  {
    id: uid(),
    tipo: "faq",
    config: {
      titulo_secao: "Perguntas frequentes",
      perguntas: [
        { pergunta: "Preciso de pedido médico?", resposta: "Para a maioria dos exames de check-up, não. Para alguns mais específicos sim." },
        { pergunta: "Aceita convênio?", resposta: "Sim, trabalhamos com os principais convênios. Confira no rodapé." },
        { pergunta: "Quanto tempo dura o jejum?", resposta: "Em média 8 a 12 horas. Detalhamos por exame na confirmação do pedido." },
        { pergunta: "Em quanto tempo recebo os resultados?", resposta: "Até 48h úteis na maioria dos exames. Acompanhe pelo seu portal Sancet." },
      ],
    },
  },
  {
    id: uid(),
    tipo: "cta",
    config: {
      titulo: "Comece o ano cuidando de você",
      subtitulo: "Agende seu check-up em 2 minutos pelo site",
      botao_texto: "Montar meu pedido",
      botao_link: "/exames",
      cor_fundo: "vermelho",
    },
  },
  {
    id: uid(),
    tipo: "convenios",
    config: { titulo_secao: "Convênios aceitos", logos: [] },
  },
];

export const TEMPLATES: LandingTemplate[] = [
  {
    id: "branco",
    nome: "Em branco",
    descricao: "Comece do zero e monte sua página bloco a bloco.",
    thumbnail_gradient: "linear-gradient(135deg, #f1f5f9, #cbd5e1)",
    cor_principal: "#64748b",
    blocos: () => [],
  },
  {
    id: "outubro-rosa",
    nome: "Outubro Rosa — Campanha de prevenção",
    descricao: "Página completa para a campanha de prevenção ao câncer de mama.",
    thumbnail_gradient: "linear-gradient(135deg, #F8BBD0, #E91E63)",
    cor_principal: "#E91E63",
    blocos: outubroRosa,
  },
  {
    id: "novembro-azul",
    nome: "Novembro Azul — Saúde do Homem",
    descricao: "Página completa para a campanha de saúde masculina.",
    thumbnail_gradient: "linear-gradient(135deg, #BBDEFB, #1976D2)",
    cor_principal: "#1976D2",
    blocos: novembroAzul,
  },
];
