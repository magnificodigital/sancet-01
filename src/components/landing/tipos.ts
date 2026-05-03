export type TipoBloco =
  | "hero"
  | "texto"
  | "servicos"
  | "imagem-texto"
  | "cta"
  | "faq"
  | "depoimentos"
  | "estatisticas"
  | "convenios"
  | "exames_destaque";

export type CardServico = { icone: string; titulo: string; descricao: string };
export type Pergunta = { pergunta: string; resposta: string };
export type Depoimento = { id: string; foto_url: string; nome: string; texto: string; estrelas: number };
export type ItemEstatistica = { id: string; numero: string; sufixo: string; descricao: string };
export type LogoConvenio = { id: string; imagem_url: string; alt: string };

export type ConfigHero = {
  titulo: string;
  subtitulo: string;
  imagem_url: string;
  cta_texto: string;
  cta_link: string;
  alinhamento: "esquerda" | "centro";
};
export type ConfigTexto = { titulo: string; conteudo: string };
export type ConfigServicos = { titulo_secao: string; cards: CardServico[] };
export type ConfigImagemTexto = {
  titulo: string;
  texto: string;
  imagem_url: string;
  imagem_lado: "esquerda" | "direita";
};
export type ConfigCTA = {
  titulo: string;
  subtitulo: string;
  botao_texto: string;
  botao_link: string;
  cor_fundo: "vermelho" | "azul";
};
export type ConfigFAQ = { titulo_secao: string; perguntas: Pergunta[] };
export type ConfigDepoimentos = {
  titulo_secao: string;
  subtitulo_secao: string;
  depoimentos: Depoimento[];
};
export type ConfigEstatisticas = {
  cor_fundo: "branco" | "vermelho" | "azul" | "cinza";
  itens: ItemEstatistica[];
};
export type ConfigConvenios = { titulo_secao: string; logos: LogoConvenio[] };
export type ConfigExamesDestaque = {
  titulo_secao: string;
  subtitulo_secao: string;
  exames_ids: string[];
  mostrar_botao_carrinho: boolean;
};

export type Bloco =
  | { id: string; tipo: "hero"; config: ConfigHero }
  | { id: string; tipo: "texto"; config: ConfigTexto }
  | { id: string; tipo: "servicos"; config: ConfigServicos }
  | { id: string; tipo: "imagem-texto"; config: ConfigImagemTexto }
  | { id: string; tipo: "cta"; config: ConfigCTA }
  | { id: string; tipo: "faq"; config: ConfigFAQ }
  | { id: string; tipo: "depoimentos"; config: ConfigDepoimentos }
  | { id: string; tipo: "estatisticas"; config: ConfigEstatisticas }
  | { id: string; tipo: "convenios"; config: ConfigConvenios }
  | { id: string; tipo: "exames_destaque"; config: ConfigExamesDestaque };

export const BIBLIOTECA: { tipo: TipoBloco; label: string; descricao: string }[] = [
  { tipo: "hero", label: "Hero", descricao: "Banner principal" },
  { tipo: "texto", label: "Texto", descricao: "Título + parágrafo" },
  { tipo: "servicos", label: "Serviços", descricao: "Grid de cards" },
  { tipo: "imagem-texto", label: "Imagem + Texto", descricao: "Duas colunas" },
  { tipo: "cta", label: "CTA", descricao: "Chamada para ação" },
  { tipo: "faq", label: "FAQ", descricao: "Perguntas e respostas" },
  { tipo: "depoimentos", label: "Depoimentos", descricao: "Carrossel de avaliações" },
  { tipo: "estatisticas", label: "Estatísticas", descricao: "Números em destaque" },
  { tipo: "convenios", label: "Convênios", descricao: "Grid de logos" },
  { tipo: "exames_destaque", label: "Exames em destaque", descricao: "Cards de exames" },
];

export const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36));

export const criarBloco = (tipo: TipoBloco): Bloco => {
  switch (tipo) {
    case "hero":
      return {
        id: uid(),
        tipo,
        config: {
          titulo: "Cuide da sua saúde com a Sancet",
          subtitulo: "Exames laboratoriais com qualidade e agilidade.",
          imagem_url: "",
          cta_texto: "Agendar agora",
          cta_link: "#",
          alinhamento: "esquerda",
        },
      };
    case "texto":
      return {
        id: uid(),
        tipo,
        config: {
          titulo: "Sobre este serviço",
          conteudo:
            "Adicione aqui o conteúdo da sua página.\nVocê pode usar quebras de linha para separar parágrafos.",
        },
      };
    case "servicos":
      return {
        id: uid(),
        tipo,
        config: {
          titulo_secao: "Nossos serviços",
          cards: [
            { icone: "FlaskConical", titulo: "Exames laboratoriais", descricao: "Mais de 2.000 exames disponíveis." },
            { icone: "Home", titulo: "Coleta em casa", descricao: "Comodidade e segurança." },
            { icone: "Syringe", titulo: "Vacinas", descricao: "Calendário completo de vacinação." },
          ],
        },
      };
    case "imagem-texto":
      return {
        id: uid(),
        tipo,
        config: {
          titulo: "Atendimento humanizado",
          texto: "Nossa equipe está preparada para oferecer o melhor cuidado.",
          imagem_url: "",
          imagem_lado: "esquerda",
        },
      };
    case "cta":
      return {
        id: uid(),
        tipo,
        config: {
          titulo: "Pronto para começar?",
          subtitulo: "Agende seu exame em poucos cliques.",
          botao_texto: "Quero agendar",
          botao_link: "#",
          cor_fundo: "vermelho",
        },
      };
    case "faq":
      return {
        id: uid(),
        tipo,
        config: {
          titulo_secao: "Perguntas frequentes",
          perguntas: [
            { pergunta: "Como faço para agendar?", resposta: "Acesse nosso site ou ligue para a unidade mais próxima." },
            { pergunta: "Aceitam convênio?", resposta: "Sim, trabalhamos com os principais convênios." },
          ],
        },
      };
    case "depoimentos":
      return {
        id: uid(),
        tipo,
        config: {
          titulo_secao: "O que dizem nossos pacientes",
          subtitulo_secao: "",
          depoimentos: [
            { id: uid(), foto_url: "", nome: "Maria Silva", texto: "Atendimento excelente, recomendo!", estrelas: 5 },
            { id: uid(), foto_url: "", nome: "João Santos", texto: "Resultados rápidos e equipe atenciosa.", estrelas: 5 },
            { id: uid(), foto_url: "", nome: "Ana Costa", texto: "Processo simples do início ao fim.", estrelas: 4 },
          ],
        },
      };
    case "estatisticas":
      return {
        id: uid(),
        tipo,
        config: {
          cor_fundo: "azul",
          itens: [
            { id: uid(), numero: "30", sufixo: "+", descricao: "Anos de experiência" },
            { id: uid(), numero: "2000", sufixo: "+", descricao: "Exames disponíveis" },
            { id: uid(), numero: "50", sufixo: "k", descricao: "Pacientes atendidos" },
            { id: uid(), numero: "98", sufixo: "%", descricao: "Satisfação" },
          ],
        },
      };
    case "convenios":
      return {
        id: uid(),
        tipo,
        config: {
          titulo_secao: "Convênios aceitos",
          logos: [],
        },
      };
    case "exames_destaque":
      return {
        id: uid(),
        tipo,
        config: {
          titulo_secao: "Exames em destaque",
          subtitulo_secao: "",
          exames_ids: [],
          mostrar_botao_carrinho: true,
        },
      };
  }
};
