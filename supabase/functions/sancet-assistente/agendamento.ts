// Agendamento 100% pelo chat — espelha o fluxo do site (EscolherConvenio →
// EnviarPedido → EtapaConfirmacao → Pagamento), com as mesmas regras:
// modos de atendimento (particular/convênio/em casa/só Matriz), datas,
// documentos obrigatórios, termos e a mesma função de criação do pedido.
// O rascunho fica em chat_conversas.contexto.agendamento.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type Doc = { path: string; nome: string; mime: string };
export type Rascunho = {
  tipo?: "particular" | "convenio";
  convenio?: { id: string; nome: string; codigo_shift: string | null } | null;
  plano?: { codigo: string; descricao: string } | null;
  carteirinha?: string | null;
  carteirinha_salva_url?: string | null; // foto já salva na conta
  salvar_convenio?: boolean;
  itens?: any[];
  modalidade?: "unidade" | "domicilio";
  unidade?: { codigo_shift: string; nome: string } | null;
  endereco?: Record<string, string> | null;
  data?: string | null; // AAAA-MM-DD
  periodo?: "manha" | "tarde" | null;
  tipo_documento?: "rg" | "cnh";
  documentos?: { pedido_medico?: Doc[]; rg_frente?: Doc; rg_verso?: Doc; carteirinha?: Doc; relatorio?: Doc };
  exames_ia?: { codigo_shift: string; nome: string }[];
  deficiencias?: string;
};
export type Modos = { particular: boolean; convenio: boolean; casa: boolean; somenteMatriz: boolean; pularCatalogo: boolean };
export type Passo = { texto: string; acao: any | null; completo: boolean };

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const AGENDA_PADRAO: Record<string, string> = { "0": "fechado", "1": "ambos", "2": "ambos", "3": "ambos", "4": "ambos", "5": "ambos", "6": "manha" };
const MATRIZ_CODIGO = "1";
const MAX_PEDIDOS = 5;

const agoraSP = () => new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const br = (s: string) => s.split("-").reverse().join("/");
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const comoPaciente = (jwt: string) =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${jwt}` } } });

/** Mesmas chaves de "Modo de atendimento" do site (configuracoes ATEND_*). */
export async function modosAtendimento(admin: any): Promise<Modos> {
  const { data } = await admin.from("configuracoes").select("chave, valor").like("chave", "ATEND_%");
  const c: Record<string, string> = {};
  (data ?? []).forEach((r: any) => (c[r.chave] = String(r.valor ?? "")));
  const b = (k: string, padrao: boolean) => (c[k] == null || c[k] === "" ? padrao : c[k] === "true");
  return {
    particular: b("ATEND_PARTICULAR", false),
    convenio: b("ATEND_CONVENIO", true),
    casa: b("ATEND_SANCET_CASA", false),
    somenteMatriz: b("ATEND_SOMENTE_MATRIZ", true),
    pularCatalogo: b("ATEND_CONVENIO_PULAR_CATALOGO", true),
  };
}

const primeiroDia = () => {
  const sp = agoraSP();
  const min = new Date(sp);
  min.setHours(0, 0, 0, 0);
  min.setDate(min.getDate() + 3 + (sp.getHours() >= 16 ? 1 : 0));
  return min;
};
const disp = (dias: any, dow: number) => (dias?.[String(dow)] ?? AGENDA_PADRAO[String(dow)]) as string;

/** Próximos dias com atendimento na unidade (mesma regra do site). */
export async function opcoesDatas(admin: any, unidadeCodigo: string, qtd = 12) {
  const { data: un } = await admin.from("unidades_cache").select("horarios").eq("codigo_shift", unidadeCodigo).maybeSingle();
  const dias = un?.horarios?.dias ?? null;
  const out: { data: string; rotulo: string; manha: boolean; tarde: boolean }[] = [];
  const d = primeiroDia();
  const limite = new Date(agoraSP());
  limite.setDate(limite.getDate() + 30);
  while (out.length < qtd && d <= limite) {
    const v = disp(dias, d.getDay());
    if (v !== "fechado") {
      out.push({ data: iso(d), rotulo: `${DIAS[d.getDay()]}, ${br(iso(d)).slice(0, 5)}`, manha: v === "ambos" || v === "manha", tarde: v === "ambos" || v === "tarde" });
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export async function validarData(admin: any, unidadeCodigo: string, data: string, periodo: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return "Data inválida.";
  if (periodo !== "manha" && periodo !== "tarde") return "Escolha manhã ou tarde.";
  const d = new Date(`${data}T12:00:00`);
  const min = primeiroDia();
  const max = new Date(agoraSP());
  max.setDate(max.getDate() + 30);
  if (d < min) return `A agenda começa em ${br(iso(min))}.`;
  if (d > max) return "Só dá para agendar até 30 dias à frente.";
  const { data: un } = await admin.from("unidades_cache").select("nome, horarios").eq("codigo_shift", unidadeCodigo).maybeSingle();
  const v = disp(un?.horarios?.dias ?? null, d.getDay());
  if (v === "fechado") return `A unidade não atende ${DIAS[d.getDay()]}.`;
  if ((v === "manha" && periodo === "tarde") || (v === "tarde" && periodo === "manha")) {
    return `Nesse dia a unidade só atende ${v === "manha" ? "de manhã" : "à tarde"}.`;
  }
  return null;
}

const docsObrigatorios = (r: Rascunho) => {
  const rot = r.tipo_documento === "cnh" ? "CNH" : "RG";
  const lista: { chave: string; rotulo: string; multiplo?: boolean; opcional?: boolean; ok: boolean; qtd?: number }[] = [
    { chave: "pedido_medico", rotulo: "Pedido médico", multiplo: true, ok: !!r.documentos?.pedido_medico?.length, qtd: r.documentos?.pedido_medico?.length ?? 0 },
    { chave: "rg_frente", rotulo: `${rot} — frente`, ok: !!r.documentos?.rg_frente },
    { chave: "rg_verso", rotulo: `${rot} — verso`, ok: !!r.documentos?.rg_verso },
  ];
  if (r.tipo === "convenio") lista.push({ chave: "carteirinha", rotulo: "Carteirinha do convênio (foto)", ok: !!r.documentos?.carteirinha || !!r.carteirinha_salva_url });
  lista.push({ chave: "relatorio", rotulo: "Relatório médico (opcional)", opcional: true, ok: !!r.documentos?.relatorio });
  return lista;
};

const totalParticular = (r: Rascunho) =>
  (r.itens ?? []).reduce((s, i) => s + (Number(i.precoParticular) || 0), 0);

/** Resumo para o cartão de confirmação. */
export function resumo(r: Rascunho, paciente: any) {
  return {
    paciente: paciente?.nome ?? null,
    tipo: r.tipo,
    convenio: r.convenio?.nome ?? null,
    plano: r.plano?.descricao ?? null,
    carteirinha: r.carteirinha ?? null,
    exames: (r.itens ?? []).map((i) => i.nome),
    exames_ia: (r.exames_ia ?? []).map((e) => e.nome),
    total: r.tipo === "particular" ? brl(totalParticular(r)) : null,
    onde: r.modalidade === "domicilio"
      ? `Coleta em casa: ${[r.endereco?.logradouro, r.endereco?.numero, r.endereco?.bairro, r.endereco?.cidade].filter(Boolean).join(", ")}`
      : r.unidade?.nome ?? null,
    quando: r.data ? `${DIAS[new Date(`${r.data}T12:00:00`).getDay()]}, ${br(r.data)} — ${r.periodo === "tarde" ? "tarde (12h às 16h)" : "manhã (6h às 12h)"}` : null,
    documentos: docsObrigatorios(r).filter((d) => d.ok).map((d) => d.rotulo + (d.qtd && d.qtd > 1 ? ` (${d.qtd})` : "")),
    tipo_documento: r.tipo_documento ?? "rg",
    salvar_convenio: !!r.salvar_convenio,
  };
}

/**
 * Próximo passo do agendamento, na mesma ordem do site. Devolve o texto para o
 * paciente e a "ação" (cartão interativo) que o chat mostra.
 */
export async function proximoPasso(admin: any, r: Rascunho, modos: Modos, paciente: any): Promise<Passo> {
  if (!paciente) {
    return {
      texto: "Para fazer o seu agendamento eu preciso que você entre na sua conta (ou crie uma, é rapidinho). Assim seus dados e documentos ficam seguros. Depois é só voltar aqui que a gente continua de onde parou. 🙂",
      acao: { tipo: "login" },
      completo: false,
    };
  }
  if (!r.tipo) {
    const opcoes = [modos.convenio && "convenio", modos.particular && "particular"].filter(Boolean);
    if (opcoes.length === 1) r.tipo = opcoes[0] as any;
    else if (!opcoes.length) return { texto: "No momento o agendamento online está indisponível. Fale com a nossa equipe, por favor.", acao: null, completo: false };
    else return { texto: "Vai ser pelo **convênio** ou **particular**?", acao: { tipo: "escolher_tipo", opcoes }, completo: false };
  }
  if (r.tipo === "convenio") {
    if (!r.convenio) {
      const { data: salvos } = await admin
        .from("paciente_convenios")
        .select("id, convenio_id, convenio_nome, plano_descricao, numero_carteirinha, principal")
        .eq("paciente_id", paciente.id)
        .order("principal", { ascending: false })
        .limit(5);
      return { texto: "Qual é o seu **convênio**?", acao: { tipo: "convenio", salvos: salvos ?? [] }, completo: false };
    }
    if (!r.plano) {
      const { count } = await admin.from("convenios_planos").select("id", { count: "exact", head: true }).eq("convenio_id", r.convenio.id).eq("ativo", true);
      if ((count ?? 0) > 0) return { texto: `Qual é o seu **plano** ${r.convenio.nome}? (está na carteirinha)`, acao: { tipo: "plano", convenio_id: r.convenio.id }, completo: false };
    }
    if (!r.carteirinha) return { texto: "Qual é o **número da sua carteirinha**?", acao: { tipo: "carteirinha" }, completo: false };
  }
  if (r.tipo === "particular" && !(r.itens ?? []).length) {
    return {
      texto: "Quais exames você vai fazer? Pode me dizer os nomes ou enviar a **foto do pedido médico** que eu encontro para você.",
      acao: { tipo: "documentos", itens: docsObrigatorios(r).filter((d) => d.chave === "pedido_medico"), tipo_documento: r.tipo_documento ?? "rg" },
      completo: false,
    };
  }
  if (!r.modalidade) {
    const podeCasa = modos.casa && (r.itens ?? []).length > 0 && (r.itens ?? []).every((i) => i.disponivelEmCasa === true);
    if (podeCasa) return { texto: "Prefere ir a uma **unidade** ou fazer a **coleta em casa** (Sancet em Casa)?", acao: { tipo: "modalidade" }, completo: false };
    r.modalidade = "unidade";
  }
  if (r.modalidade === "unidade") {
    if (!r.unidade) {
      if (modos.somenteMatriz) {
        const { data: m } = await admin.from("unidades_cache").select("codigo_shift, nome").eq("codigo_shift", MATRIZ_CODIGO).maybeSingle();
        if (m) r.unidade = { codigo_shift: m.codigo_shift, nome: m.nome };
      }
      if (!r.unidade) {
        const { data: uns } = await admin.from("unidades_cache").select("codigo_shift, nome, bairro, cidade").eq("ativo", true).order("nome");
        return { texto: "Em qual **unidade** você quer fazer?", acao: { tipo: "unidade", opcoes: uns ?? [] }, completo: false };
      }
    }
    if (!r.data || !r.periodo) {
      return {
        texto: `Escolha o **dia** e o **período** na unidade ${r.unidade!.nome}:`,
        acao: { tipo: "datas", opcoes: await opcoesDatas(admin, r.unidade!.codigo_shift) },
        completo: false,
      };
    }
  } else if (!r.endereco?.logradouro || !r.endereco?.numero || !r.endereco?.cidade) {
    const { data: p } = await admin.from("pacientes").select("cep, logradouro, numero, complemento, bairro, cidade, uf").eq("id", paciente.id).maybeSingle();
    return { texto: "Qual o **endereço** para a coleta?", acao: { tipo: "endereco", sugestao: p ?? {} }, completo: false };
  }
  const docs = docsObrigatorios(r);
  if (docs.some((d) => !d.ok && !d.opcional)) {
    return {
      texto: "Agora preciso dos **documentos**. Toque em cada item para enviar a foto ou o PDF:",
      acao: { tipo: "documentos", itens: docs, tipo_documento: r.tipo_documento ?? "rg" },
      completo: false,
    };
  }
  return {
    texto: "Tudo pronto! Confira o resumo, aceite os termos e confirme o envio do pedido:",
    acao: { tipo: "confirmar_agendamento", resumo: resumo(r, paciente) },
    completo: true,
  };
}

/** Aplica uma escolha do paciente (cartões do chat ou ferramenta da IA), validando como o site. */
export async function aplicar(admin: any, r: Rascunho, modos: Modos, campo: string, valor: any, paciente: any): Promise<string | null> {
  switch (campo) {
    case "tipo":
      if (valor === "particular" && !modos.particular) return "No momento o agendamento particular online não está disponível.";
      if (valor === "convenio" && !modos.convenio) return "No momento o agendamento por convênio online não está disponível.";
      if (valor !== "particular" && valor !== "convenio") return "Escolha convênio ou particular.";
      if (r.tipo !== valor) Object.assign(r, { tipo: valor, convenio: null, plano: null, carteirinha: null, itens: valor === "convenio" && modos.pularCatalogo ? [] : r.itens });
      return null;
    case "convenio_salvo": {
      const { data: s } = await admin.from("paciente_convenios").select("*").eq("id", String(valor)).eq("paciente_id", paciente?.id ?? "").maybeSingle();
      if (!s) return "Convênio salvo não encontrado.";
      r.convenio = { id: s.convenio_id, nome: s.convenio_nome, codigo_shift: s.convenio_codigo_shift };
      r.plano = s.plano_codigo ? { codigo: s.plano_codigo, descricao: s.plano_descricao ?? s.plano_codigo } : null;
      r.carteirinha = s.numero_carteirinha;
      r.carteirinha_salva_url = s.url_carteirinha ?? null;
      return null;
    }
    case "convenio": {
      const { data: c } = await admin.from("convenios_cache").select("id, nome, codigo_shift").eq("id", String(valor)).eq("ativo", true).maybeSingle();
      if (!c) return "Convênio não encontrado na lista de convênios aceitos.";
      r.convenio = { id: c.id, nome: c.nome, codigo_shift: c.codigo_shift ?? null };
      r.plano = null;
      r.carteirinha_salva_url = null;
      r.salvar_convenio = true;
      return null;
    }
    case "plano": {
      if (!r.convenio) return "Escolha o convênio primeiro.";
      const { data: p } = await admin.from("convenios_planos").select("codigo_item, descricao").eq("convenio_id", r.convenio.id).eq("codigo_item", String(valor)).eq("ativo", true).maybeSingle();
      if (!p) return "Plano não encontrado para esse convênio.";
      r.plano = { codigo: p.codigo_item, descricao: p.descricao };
      return null;
    }
    case "carteirinha": {
      const n = String(valor ?? "").replace(/[^\dA-Za-z.\- ]/g, "").trim().slice(0, 40);
      if (n.replace(/\D/g, "").length < 4) return "Número da carteirinha inválido.";
      r.carteirinha = n;
      return null;
    }
    case "modalidade":
      if (valor === "domicilio" && !modos.casa) return "A coleta em casa não está disponível no momento.";
      if (valor === "domicilio" && !(r.itens ?? []).every((i) => i.disponivelEmCasa === true)) return "Algum exame do pedido não pode ser coletado em casa.";
      r.modalidade = valor === "domicilio" ? "domicilio" : "unidade";
      return null;
    case "unidade": {
      if (modos.somenteMatriz && String(valor) !== MATRIZ_CODIGO) return "No momento o agendamento online é só na unidade Matriz.";
      const { data: u } = await admin.from("unidades_cache").select("codigo_shift, nome").eq("codigo_shift", String(valor)).eq("ativo", true).maybeSingle();
      if (!u) return "Unidade não encontrada.";
      if (r.unidade?.codigo_shift !== u.codigo_shift) Object.assign(r, { unidade: u, data: null, periodo: null });
      return null;
    }
    case "data": {
      if (!r.unidade) return "Escolha a unidade primeiro.";
      const erro = await validarData(admin, r.unidade.codigo_shift, String(valor?.data ?? ""), String(valor?.periodo ?? ""));
      if (erro) return erro;
      r.data = valor.data;
      r.periodo = valor.periodo;
      return null;
    }
    case "endereco": {
      const e = valor ?? {};
      const limpo = Object.fromEntries(["cep", "logradouro", "numero", "complemento", "bairro", "cidade", "uf"].map((k) => [k, String(e[k] ?? "").trim().slice(0, 120)]));
      if (!limpo.logradouro || !limpo.numero || !limpo.bairro || !limpo.cidade) return "Preencha rua, número, bairro e cidade.";
      r.endereco = limpo;
      return null;
    }
    case "tipo_documento":
      r.tipo_documento = valor === "cnh" ? "cnh" : "rg";
      return null;
    case "deficiencias":
      r.deficiencias = String(valor ?? "").trim().slice(0, 2000);
      return null;
    case "salvar_convenio":
      r.salvar_convenio = !!valor;
      return null;
    case "remover_documento": {
      const k = String(valor ?? "");
      if (!r.documentos) return null;
      if (k === "pedido_medico") r.documentos.pedido_medico = [];
      else delete (r.documentos as any)[k];
      return null;
    }
  }
  return "Campo inválido.";
}

export const CHAVES_DOC = ["pedido_medico", "rg_frente", "rg_verso", "carteirinha", "relatorio"];

export function anexarDocumento(r: Rascunho, chave: string, doc: Doc): string | null {
  if (!CHAVES_DOC.includes(chave)) return "Documento inválido.";
  r.documentos = r.documentos ?? {};
  if (chave === "pedido_medico") {
    const atual = r.documentos.pedido_medico ?? [];
    if (atual.length >= MAX_PEDIDOS) return `Você pode enviar até ${MAX_PEDIDOS} pedidos médicos.`;
    r.documentos.pedido_medico = [...atual, doc];
  } else {
    (r.documentos as any)[chave] = doc;
  }
  return null;
}

/**
 * Cria o pedido exatamente como o site: documentos na pasta do CPF em
 * "documentos-pedidos" e a mesma função criar_pedido_paciente_auth (com o
 * login do paciente — o servidor recalcula os preços pelo catálogo).
 */
export async function confirmarPedido(admin: any, jwt: string, paciente: any, r: Rascunho) {
  const { data: pac } = await admin.from("pacientes").select("id, cpf, nome, celular").eq("id", paciente.id).maybeSingle();
  if (!pac?.cpf) throw new Error("Cadastro sem CPF. Complete seus dados em Minha conta.");
  const copiar = async (doc: Doc | undefined, sufixo: string) => {
    if (!doc) return null;
    const { data: blob, error } = await admin.storage.from("chat-anexos").download(doc.path);
    if (error || !blob) throw new Error(`Não encontrei o arquivo "${doc.nome}". Envie de novo, por favor.`);
    const ext = (doc.nome.split(".").pop() || doc.path.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
    const destino = `${pac.cpf}/${Date.now()}-${sufixo}.${ext}`;
    const up = await admin.storage.from("documentos-pedidos").upload(destino, blob, { contentType: doc.mime || blob.type });
    if (up.error) throw new Error("Falha ao guardar o documento.");
    return destino;
  };
  const pedidos = r.documentos?.pedido_medico ?? [];
  const [urlPedido, urlRgF, urlRgV, urlCart, urlRel] = await Promise.all([
    copiar(pedidos[0], "pedido-medico"),
    copiar(r.documentos?.rg_frente, "rg-frente"),
    copiar(r.documentos?.rg_verso, "rg-verso"),
    copiar(r.documentos?.carteirinha, "carteirinha"),
    copiar(r.documentos?.relatorio, "relatorio-medico"),
  ]);
  const extras = (await Promise.all(pedidos.slice(1).map((d, i) => copiar(d, `pedido-medico-${i + 2}`)))).filter(Boolean);
  const ehConvenio = r.tipo === "convenio";
  const payload: any = {
    paciente_nome: pac.nome,
    tipo_solicitacao: r.tipo,
    modalidade_coleta: r.modalidade ?? "unidade",
    unidade_codigo_shift: r.modalidade === "unidade" ? r.unidade?.codigo_shift ?? null : null,
    unidade_nome: r.modalidade === "unidade" ? r.unidade?.nome ?? null : null,
    endereco_coleta: r.modalidade === "domicilio" ? r.endereco : null,
    itens: r.itens ?? [],
    convenio_codigo_shift: ehConvenio ? r.convenio?.codigo_shift ?? null : null,
    convenio_nome: ehConvenio ? r.convenio?.nome ?? null : null,
    plano_codigo: ehConvenio ? r.plano?.codigo ?? null : null,
    plano_descricao: ehConvenio ? r.plano?.descricao ?? null : null,
    numero_carteirinha: ehConvenio ? r.carteirinha ?? null : null,
    url_carteirinha: urlCart ?? (ehConvenio ? r.carteirinha_salva_url ?? null : null),
    url_pedido_medico: urlPedido,
    urls_pedido_medico_extra: extras,
    url_rg_frente: urlRgF,
    url_rg_verso: urlRgV,
    url_relatorio_medico: urlRel,
    tipo_documento_identidade: r.tipo_documento ?? "rg",
    deficiencias: r.deficiencias || null,
    termos_aceitos: true,
    observacoes: "Pedido feito pelo chat do site.",
  };
  if (r.modalidade === "unidade" && r.data) {
    payload.data_agendamento = r.data;
    payload.periodo_agendamento = r.periodo;
  }
  const cli = comoPaciente(jwt);
  const { data, error } = await cli.rpc("criar_pedido_paciente_auth", { p_pedido: payload });
  if (error) throw new Error(error.message || "Não foi possível criar o pedido.");
  const protocolo = (data as any)?.protocolo as string;
  const pedidoId = (data as any)?.id as string;

  // Mesmos passos do site depois de criar (melhor esforço).
  if (r.exames_ia?.length) await cli.rpc("registrar_exames_ia_auth", { p_protocolo: protocolo, p_exames: r.exames_ia }).then(() => {}, () => {});
  if (ehConvenio && r.salvar_convenio && r.convenio && r.carteirinha) {
    await admin.from("paciente_convenios").insert({
      paciente_id: pac.id, convenio_id: r.convenio.id, convenio_nome: r.convenio.nome, convenio_codigo_shift: r.convenio.codigo_shift,
      plano_codigo: r.plano?.codigo ?? null, plano_descricao: r.plano?.descricao ?? null, numero_carteirinha: r.carteirinha,
      url_carteirinha: urlCart ?? r.carteirinha_salva_url ?? null,
    }).then(() => {}, () => {});
  }
  // Contas de teste (*.invalid) não disparam e-mail para a equipe.
  const { data: pacEmail } = await admin.from("pacientes").select("email").eq("id", pac.id).maybeSingle();
  if (!String(pacEmail?.email ?? "").endsWith(".invalid")) await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/enviar-email-pedido`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "", "Content-Type": "application/json" },
    body: JSON.stringify({ pedido_id: pedidoId, tipo: "novo" }),
  }).catch(() => {});
  return { protocolo, pedidoId, valor_centavos: Number((data as any)?.valor_total_centavos ?? 0) };
}

/** Pagamento do particular pela mesma função do site (PIX, cartão ou boleto). */
export async function gerarPagamento(jwt: string, protocolo: string, metodo: string) {
  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sancet-criar-pagamento`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "", "Content-Type": "application/json" },
    body: JSON.stringify({ protocolo, metodo: ["pix", "cartao", "boleto"].includes(metodo) ? metodo : "pix" }),
  });
  return await r.json().catch(() => ({ error: "Falha ao gerar o pagamento." }));
}
