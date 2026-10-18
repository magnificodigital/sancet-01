// Áreas do painel e o que cada usuário pode fazer nelas (ver / editar / excluir).
// O banco aplica as mesmas regras (função tem_permissao) — isto aqui é o espelho
// para a tela. Quem define é o super admin (Super Admin > Permissões).

export type Acao = "ver" | "editar" | "excluir";
export type Permissoes = Record<string, Partial<Record<Acao, boolean>>>;

export type Modulo = { id: string; label: string; grupo: string; acoes: Acao[]; dica?: string };

export const MODULOS: Modulo[] = [
  { id: "visao", label: "Visão Geral", grupo: "Atendimento", acoes: ["ver"] },
  { id: "pedidos", label: "Pedidos", grupo: "Atendimento", acoes: ["ver", "editar", "excluir"], dica: "Editar = mudar status, itens, documentos." },
  { id: "conversas", label: "Conversas", grupo: "Atendimento", acoes: ["ver", "editar"], dica: "Editar = assumir, responder, transferir." },
  { id: "checkin", label: "Check-in", grupo: "Atendimento", acoes: ["ver"], dica: "Inclui marcar o paciente como atendido." },
  { id: "pacientes", label: "Pacientes", grupo: "Atendimento", acoes: ["ver", "editar", "excluir"] },
  { id: "catalogo", label: "Catálogo", grupo: "Cadastros", acoes: ["ver", "editar", "excluir"] },
  { id: "unidades", label: "Unidades", grupo: "Cadastros", acoes: ["ver", "editar", "excluir"] },
  { id: "convenios", label: "Convênios", grupo: "Cadastros", acoes: ["ver", "editar"] },
  { id: "paginas", label: "Sites e páginas", grupo: "Marketing", acoes: ["ver", "editar", "excluir"] },
  { id: "recall", label: "Recall", grupo: "Marketing", acoes: ["ver", "editar"] },
  { id: "equipe", label: "Equipe", grupo: "Administração", acoes: ["ver", "editar", "excluir"] },
  { id: "config", label: "Configurações", grupo: "Administração", acoes: ["ver", "editar"] },
  { id: "sync", label: "Sincronizar Shift", grupo: "Administração", acoes: ["ver"] },
];

export const ACAO_LABEL: Record<Acao, string> = { ver: "Ver", editar: "Editar", excluir: "Apagar" };

const tudo = (v: boolean): Permissoes =>
  Object.fromEntries(MODULOS.map((m) => [m.id, Object.fromEntries(m.acoes.map((a) => [a, v]))]));

/** Perfis prontos para aplicar com um clique. */
export const PERFIS: { id: string; label: string; desc: string; permissoes: Permissoes }[] = [
  {
    id: "recepcao",
    label: "Recepção",
    desc: "Atende pedidos, conversas e check-in. Só consulta cadastros.",
    permissoes: {
      ...tudo(false),
      visao: { ver: true },
      pedidos: { ver: true, editar: true, excluir: false },
      conversas: { ver: true, editar: true },
      checkin: { ver: true },
      pacientes: { ver: true, editar: true, excluir: false },
      catalogo: { ver: true, editar: false, excluir: false },
      unidades: { ver: true, editar: false, excluir: false },
      convenios: { ver: true, editar: false },
    },
  },
  {
    id: "coordenacao",
    label: "Coordenação",
    desc: "Tudo do atendimento e dos cadastros, sem configurações nem equipe.",
    permissoes: {
      ...tudo(false),
      visao: { ver: true },
      pedidos: { ver: true, editar: true, excluir: true },
      conversas: { ver: true, editar: true },
      checkin: { ver: true },
      pacientes: { ver: true, editar: true, excluir: false },
      catalogo: { ver: true, editar: true, excluir: false },
      unidades: { ver: true, editar: true, excluir: false },
      convenios: { ver: true, editar: true },
      recall: { ver: true, editar: false },
    },
  },
  {
    id: "marketing",
    label: "Marketing",
    desc: "Sites, páginas, recall e visão geral.",
    permissoes: {
      ...tudo(false),
      visao: { ver: true },
      catalogo: { ver: true, editar: false, excluir: false },
      unidades: { ver: true, editar: false, excluir: false },
      paginas: { ver: true, editar: true, excluir: true },
      recall: { ver: true, editar: true },
    },
  },
  { id: "consulta", label: "Somente consulta", desc: "Vê tudo do atendimento, sem alterar nada.", permissoes: {
      ...tudo(false),
      visao: { ver: true },
      pedidos: { ver: true },
      conversas: { ver: true },
      pacientes: { ver: true },
      catalogo: { ver: true },
      unidades: { ver: true },
      convenios: { ver: true },
    } },
  { id: "completo", label: "Acesso completo", desc: "Tudo liberado (como um admin).", permissoes: tudo(true) },
];

export const pode = (p: Permissoes | null | undefined, modulo: string, acao: Acao = "ver") => !!p?.[modulo]?.[acao];
