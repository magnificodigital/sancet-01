export type TipoBloco = "hero" | "texto" | "servicos" | "imagem-texto" | "cta" | "faq";

export type CardServico = { icone: string; titulo: string; descricao: string };
export type Pergunta = { pergunta: string; resposta: string };

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

export type Bloco =
  | { id: string; tipo: "hero"; config: ConfigHero }
  | { id: string; tipo: "texto"; config: ConfigTexto }
  | { id: string; tipo: "servicos"; config: ConfigServicos }
  | { id: string; tipo: "imagem-texto"; config: ConfigImagemTexto }
  | { id: string; tipo: "cta"; config: ConfigCTA }
  | { id: string; tipo: "faq"; config: ConfigFAQ };

export const BIBLIOTECA: { tipo: TipoBloco; label: string; descricao: string }[] = [
  { tipo: "hero", label: "Hero", descricao: "Banner principal" },
  { tipo: "texto", label: "Texto", descricao: "Título + parágrafo" },
  { tipo: "servicos", label: "Serviços", descricao: "Grid de cards" },
  { tipo: "imagem-texto", label: "Imagem + Texto", descricao: "Duas colunas" },
  { tipo: "cta", label: "CTA", descricao: "Chamada para ação" },
  { tipo: "faq", label: "FAQ", descricao: "Perguntas e respostas" },
];

const uid = () =>
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
  }
};
