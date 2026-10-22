// Identificação do paciente DENTRO do chat (sem senha): CPF + data de
// nascimento → código de 6 dígitos no e-mail do cadastro → sessão do paciente
// (mesmo mecanismo do login em 2 etapas: magic link + verifyOtp no navegador).
// Nível de segurança igual ao "Esqueci minha senha". Contas da equipe NUNCA
// entram por aqui (o acesso de paciente jamais vira acesso ao staff).
import { dentroDoLimite, ipDe, MSG_LIMITE } from "../_shared/limite.ts";

const VALIDADE_MIN = 10;
const MAX_TENTATIVAS = 5;

export function cpfValido(v: string): boolean {
  const c = v.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(c[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}

const cpfFmt = (c: string) => `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`;
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
export const mascararEmail = (e: string) => {
  const [u, d] = e.split("@");
  if (!d) return "seu e-mail";
  const [dom, ...resto] = d.split(".");
  return `${u.slice(0, 2)}${"•".repeat(Math.max(2, u.length - 2))}@${dom.slice(0, 1)}${"•".repeat(Math.max(2, dom.length - 1))}.${resto.join(".")}`;
};
const nomeValido = (nome: string) => {
  const t = nome.trim();
  const partes = t.split(/\s+/).filter(Boolean);
  return t.length >= 3 && partes.length >= 2 && (t.match(/\p{L}/gu) ?? []).length >= 3 && partes.every((p) => /^\p{L}/u.test(p));
};
const dataOk = (d: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const t = new Date(`${d}T12:00:00Z`).getTime();
  return !isNaN(t) && t < Date.now() && t > Date.UTC(1900, 0, 1);
};

async function sha256(t: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function ehEquipe(admin: any, uid: string) {
  const { data } = await admin.from("user_roles").select("user_id").eq("user_id", uid).limit(1);
  return (data ?? []).length > 0;
}

async function usuarioPorEmail(admin: any, email: string) {
  const { data } = await admin.rpc("auth_usuario_por_email", { _email: email });
  return (data as string | null) ?? null;
}

async function enviarCodigo(admin: any, email: string, codigo: string, nome: string | null) {
  const { data: rows } = await admin.from("configuracoes").select("chave, valor").in("chave", ["RESEND_API_KEY", "RESEND_EMAIL_FROM"]);
  const c: Record<string, string> = {};
  (rows ?? []).forEach((r: any) => (c[r.chave] = String(r.valor ?? "")));
  if (!c.RESEND_API_KEY?.trim()) throw new Error("O envio de e-mail não está configurado. Entre pela página Entrar ou fale com a equipe.");
  // Contas de teste (*.invalid) não disparam e-mail.
  if (email.endsWith(".invalid")) return;
  const primeiro = (nome ?? "").trim().split(/\s+/)[0] ?? "";
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${c.RESEND_API_KEY.trim()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: c.RESEND_EMAIL_FROM?.trim() || "onboarding@resend.dev",
      to: [email],
      subject: "Sancet — Seu código de identificação",
      html: `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f6f6f6;margin:0;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #eee">
    <div style="background:#C8102E;color:#fff;padding:16px 20px;font-size:18px;font-weight:600">Sancet</div>
    <div style="padding:24px;color:#222;font-size:14px;line-height:1.55">
      <h2 style="margin:0 0 12px;color:#C8102E">${primeiro ? `Olá, ${primeiro}!` : "Olá!"}</h2>
      <p>Use o código abaixo no chat do site para confirmar que é você. Ele expira em <b>${VALIDADE_MIN} minutos</b>.</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0">${codigo}</div>
      <p style="color:#888;font-size:12px">Nunca compartilhe este código. A Sancet não pede este código por telefone. Se não foi você, ignore este e-mail.</p>
    </div>
  </div></body></html>`,
      text: `Seu código de identificação Sancet é: ${codigo}\n\nEle expira em ${VALIDADE_MIN} minutos. Nunca compartilhe este código. Se não foi você, ignore este e-mail.`,
    }),
  });
  if (!r.ok) throw new Error("Não consegui enviar o e-mail com o código agora. Tente de novo em instantes.");
}

const novoCodigo = () => String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));

async function gravarCodigo(admin: any, conversaId: string, linha: Record<string, unknown>, codigo: string) {
  await admin.from("chat_codigos").update({ usado_em: new Date().toISOString() }).eq("conversa_id", conversaId).is("usado_em", null);
  const { error } = await admin.from("chat_codigos").insert({
    conversa_id: conversaId,
    codigo_hash: await sha256(`${conversaId}:${codigo}`),
    expira_em: new Date(Date.now() + VALIDADE_MIN * 60_000).toISOString(),
    ...linha,
  });
  if (error) throw new Error("Não foi possível gerar o código agora.");
}

type Resp = { ok: boolean; erro?: string; acao?: any; texto?: string; token_hash?: string; email?: string; paciente_id?: string; nome?: string | null };

/** Passo 1 (já tem cadastro): CPF + nascimento → código no e-mail do cadastro. */
export async function identificar(admin: any, req: Request, conversaId: string, cpfIn: string, nascimento: string): Promise<Resp> {
  const cpf = String(cpfIn ?? "").replace(/\D/g, "");
  if (!cpfValido(cpf)) return { ok: false, erro: "CPF inválido. Confira os números." };
  if (!dataOk(String(nascimento ?? ""))) return { ok: false, erro: "Data de nascimento inválida." };
  if (!(await dentroDoLimite("chat-ident-ip", ipDe(req), 10, 3600)) || !(await dentroDoLimite("chat-ident-cpf", cpf, 5, 3600))) {
    return { ok: false, erro: MSG_LIMITE };
  }
  const { data: lista } = await admin
    .from("pacientes")
    .select("id, nome, nome_social, email, auth_user_id, data_nascimento")
    .or(`cpf.eq.${cpf},cpf.eq.${cpfFmt(cpf)}`)
    .limit(2);
  const p = (lista ?? [])[0];
  // Mesma resposta para "CPF não existe" e "data não confere": ninguém
  // descobre se um CPF tem cadastro só tentando.
  const naoAchei: Resp = {
    ok: false,
    erro: "Não encontrei um cadastro com esse CPF e essa data de nascimento. Confira os dados ou faça seu cadastro aqui mesmo.",
    acao: { tipo: "identificar", modo: "entrar", sugerir_cadastro: true },
  };
  if (!p || !p.data_nascimento || String(p.data_nascimento).slice(0, 10) !== nascimento) return naoAchei;

  let email = "";
  if (p.auth_user_id) {
    if (await ehEquipe(admin, p.auth_user_id)) return naoAchei;
    const { data: e } = await admin.rpc("auth_email_por_id", { _uid: p.auth_user_id });
    email = String(e ?? "").toLowerCase();
    // Conta sem e-mail utilizável: não dá para confirmar por aqui.
    if (!emailOk(email)) return naoAchei;
  } else {
    email = String(p.email ?? "").trim().toLowerCase();
  }
  if (!emailOk(email)) {
    // Cadastrado pela equipe sem e-mail: igual ao "Criar conta" do site
    // (CPF + nascimento conferem), o paciente informa um e-mail para receber o código.
    return {
      ok: true,
      texto: "Encontrei seu cadastro, mas ele não tem e-mail. Informe um e-mail para eu enviar o código de confirmação:",
      acao: { tipo: "identificar", modo: "email", cpf, nascimento },
    };
  }
  const codigo = novoCodigo();
  await gravarCodigo(admin, conversaId, { finalidade: "login", paciente_id: p.id, email }, codigo);
  await enviarCodigo(admin, email, codigo, p.nome_social || p.nome);
  return {
    ok: true,
    texto: `Enviei um código de 6 dígitos para **${mascararEmail(email)}**. Digite aqui para confirmar que é você:`,
    acao: { tipo: "codigo", email: mascararEmail(email) },
  };
}

/** Cadastro sem e-mail (feito pela equipe): o paciente informa o e-mail. */
export async function informarEmail(admin: any, req: Request, conversaId: string, cpfIn: string, nascimento: string, emailIn: string): Promise<Resp> {
  const cpf = String(cpfIn ?? "").replace(/\D/g, "");
  const email = String(emailIn ?? "").trim().toLowerCase();
  if (!emailOk(email)) return { ok: false, erro: "E-mail inválido." };
  if (!(await dentroDoLimite("chat-ident-ip", ipDe(req), 10, 3600)) || !(await dentroDoLimite("chat-ident-cpf", cpf, 5, 3600))) {
    return { ok: false, erro: MSG_LIMITE };
  }
  const { data: p } = await admin
    .from("pacientes")
    .select("id, nome, nome_social, email, auth_user_id, data_nascimento")
    .or(`cpf.eq.${cpf},cpf.eq.${cpfFmt(cpf)}`)
    .limit(1)
    .maybeSingle();
  if (!p || p.auth_user_id || emailOk(String(p.email ?? "")) || String(p.data_nascimento ?? "").slice(0, 10) !== nascimento) {
    return { ok: false, erro: "Não foi possível continuar com esses dados.", acao: { tipo: "identificar", modo: "entrar" } };
  }
  if (await usuarioPorEmail(admin, email)) return { ok: false, erro: "Este e-mail já está em uso em outra conta. Use outro e-mail." };
  const codigo = novoCodigo();
  await gravarCodigo(admin, conversaId, { finalidade: "login", paciente_id: p.id, email }, codigo);
  await enviarCodigo(admin, email, codigo, p.nome_social || p.nome);
  return {
    ok: true,
    texto: `Enviei um código de 6 dígitos para **${mascararEmail(email)}**. Digite aqui para confirmar:`,
    acao: { tipo: "codigo", email: mascararEmail(email) },
  };
}

/** Cadastro novo pelo chat (mesmas validações do "Criar conta" do site). */
export async function cadastrar(admin: any, req: Request, conversaId: string, d: any): Promise<Resp> {
  const nome = String(d?.nome ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const cpf = String(d?.cpf ?? "").replace(/\D/g, "");
  const nascimento = String(d?.nascimento ?? "");
  const email = String(d?.email ?? "").trim().toLowerCase();
  const celular = String(d?.celular ?? "").replace(/\D/g, "").slice(0, 13);
  if (!nomeValido(nome)) return { ok: false, erro: "Informe o nome completo (nome e sobrenome)." };
  if (!cpfValido(cpf)) return { ok: false, erro: "CPF inválido. Confira os números." };
  if (!dataOk(nascimento)) return { ok: false, erro: "Data de nascimento inválida." };
  if (!emailOk(email)) return { ok: false, erro: "E-mail inválido." };
  if (celular.length < 10) return { ok: false, erro: "Celular inválido (com DDD)." };
  if (d?.termos !== true) return { ok: false, erro: "É preciso aceitar os termos de uso e a política de privacidade." };
  if (!(await dentroDoLimite("chat-ident-ip", ipDe(req), 10, 3600)) || !(await dentroDoLimite("chat-ident-cpf", cpf, 5, 3600))) {
    return { ok: false, erro: MSG_LIMITE };
  }
  const { data: existente } = await admin
    .from("pacientes")
    .select("id, auth_user_id, data_nascimento")
    .or(`cpf.eq.${cpf},cpf.eq.${cpfFmt(cpf)}`)
    .limit(1)
    .maybeSingle();
  if (existente?.auth_user_id) {
    return { ok: false, erro: "Este CPF já tem cadastro. Use \"Já tenho cadastro\" para se identificar.", acao: { tipo: "identificar", modo: "entrar" } };
  }
  if (existente?.id && existente.data_nascimento && String(existente.data_nascimento).slice(0, 10) !== nascimento) {
    return { ok: false, erro: "Os dados não conferem com o cadastro existente deste CPF. Procure a recepção da Sancet." };
  }
  if (await usuarioPorEmail(admin, email)) return { ok: false, erro: "Este e-mail já está em uso. Use \"Já tenho cadastro\" ou outro e-mail." };
  const codigo = novoCodigo();
  await gravarCodigo(admin, conversaId, {
    finalidade: "cadastro", paciente_id: existente?.id ?? null, email,
    dados: { nome, cpf, nascimento, celular, termos_em: new Date().toISOString() },
  }, codigo);
  await enviarCodigo(admin, email, codigo, nome);
  return {
    ok: true,
    texto: `Quase lá! Enviei um código de 6 dígitos para **${mascararEmail(email)}**. Digite aqui para confirmar seu e-mail:`,
    acao: { tipo: "codigo", email: mascararEmail(email) },
  };
}

/** Passo 2: confere o código e devolve o token para o navegador abrir a sessão. */
export async function verificarCodigo(admin: any, req: Request, conversaId: string, codigoIn: string): Promise<Resp> {
  const codigo = String(codigoIn ?? "").replace(/\D/g, "");
  if (codigo.length !== 6) return { ok: false, erro: "O código tem 6 dígitos." };
  if (!(await dentroDoLimite("chat-codigo-ip", ipDe(req), 30, 3600))) return { ok: false, erro: MSG_LIMITE };
  const { data: l } = await admin
    .from("chat_codigos")
    .select("*")
    .eq("conversa_id", conversaId)
    .is("usado_em", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const pedirDeNovo = { tipo: "identificar", modo: "entrar" };
  if (!l) return { ok: false, erro: "Nenhum código pendente. Peça um novo.", acao: pedirDeNovo };
  if (new Date(l.expira_em).getTime() < Date.now()) {
    await admin.from("chat_codigos").update({ usado_em: new Date().toISOString() }).eq("id", l.id);
    return { ok: false, erro: "O código expirou. Peça um novo.", acao: pedirDeNovo };
  }
  if (l.tentativas >= MAX_TENTATIVAS) {
    await admin.from("chat_codigos").update({ usado_em: new Date().toISOString() }).eq("id", l.id);
    return { ok: false, erro: "Muitas tentativas. Peça um novo código.", acao: pedirDeNovo };
  }
  if ((await sha256(`${conversaId}:${codigo}`)) !== l.codigo_hash) {
    await admin.from("chat_codigos").update({ tentativas: l.tentativas + 1 }).eq("id", l.id);
    const restam = MAX_TENTATIVAS - l.tentativas - 1;
    return { ok: false, erro: restam > 0 ? `Código incorreto. Você ainda tem ${restam} tentativa(s).` : "Código incorreto. Peça um novo código.", acao: restam > 0 ? undefined : pedirDeNovo };
  }
  await admin.from("chat_codigos").update({ usado_em: new Date().toISOString() }).eq("id", l.id);

  const email = String(l.email ?? "").toLowerCase();
  let pacienteId: string | null = l.paciente_id;
  let nome: string | null = null;

  if (pacienteId) {
    const { data: p } = await admin.from("pacientes").select("id, nome, nome_social, auth_user_id, cpf").eq("id", pacienteId).maybeSingle();
    if (!p) return { ok: false, erro: "Cadastro não encontrado.", acao: pedirDeNovo };
    nome = p.nome_social || p.nome;
    if (p.auth_user_id) {
      if (await ehEquipe(admin, p.auth_user_id)) return { ok: false, erro: "Não foi possível identificar por aqui. Entre pela página Entrar." };
    } else {
      // Cadastro feito pela equipe (ou cadastro novo de CPF já existente): cria o acesso agora.
      const dados = l.dados ?? {};
      const { data: criado, error } = await admin.auth.admin.createUser({
        email, password: crypto.randomUUID() + "Aa1!", email_confirm: true,
        user_metadata: { cpf: p.cpf, nome: dados.nome ?? p.nome, origem: "chat" },
      });
      if (error || !criado?.user) return { ok: false, erro: /already/i.test(error?.message ?? "") ? "Este e-mail já está em uso em outra conta." : "Não foi possível concluir agora." };
      const patch: Record<string, unknown> = { auth_user_id: criado.user.id, email };
      if (l.finalidade === "cadastro") Object.assign(patch, { nome: dados.nome, celular: dados.celular || null });
      // O trigger de novo usuário pode ter criado um paciente vazio para esse login: remove a duplicata.
      await admin.from("pacientes").delete().eq("auth_user_id", criado.user.id).neq("id", p.id);
      const { error: upErr } = await admin.from("pacientes").update(patch).eq("id", p.id);
      if (upErr) {
        await admin.auth.admin.deleteUser(criado.user.id);
        return { ok: false, erro: "Não foi possível concluir agora." };
      }
    }
  } else if (l.finalidade === "cadastro") {
    const dados = l.dados ?? {};
    const { data: criado, error } = await admin.auth.admin.createUser({
      email, password: crypto.randomUUID() + "Aa1!", email_confirm: true,
      user_metadata: { cpf: dados.cpf, nome: dados.nome, data_nascimento: dados.nascimento, origem: "chat" },
    });
    if (error || !criado?.user) return { ok: false, erro: /already/i.test(error?.message ?? "") ? "Este e-mail já está em uso." : "Não foi possível criar a conta agora." };
    const patch = { auth_user_id: criado.user.id, cpf: dados.cpf, data_nascimento: dados.nascimento, nome: dados.nome, email, celular: dados.celular || null };
    const { data: porAuth } = await admin.from("pacientes").select("id").eq("auth_user_id", criado.user.id).maybeSingle();
    const res = porAuth?.id
      ? await admin.from("pacientes").update(patch).eq("id", porAuth.id).select("id").single()
      : await admin.from("pacientes").insert(patch).select("id").single();
    if (res.error) {
      await admin.auth.admin.deleteUser(criado.user.id);
      return { ok: false, erro: "Não foi possível criar a conta agora." };
    }
    pacienteId = res.data.id;
    nome = dados.nome;
  } else {
    return { ok: false, erro: "Não foi possível concluir agora.", acao: pedirDeNovo };
  }

  // Trava final: o e-mail do login tem que ser o da conta DESTE paciente, e
  // nunca de alguém da equipe (o acesso de paciente jamais vira acesso ao staff).
  const { data: dono } = await admin.from("pacientes").select("auth_user_id").eq("id", pacienteId).maybeSingle();
  const uidEmail = await usuarioPorEmail(admin, email);
  if (!dono?.auth_user_id || uidEmail !== dono.auth_user_id || (await ehEquipe(admin, uidEmail))) {
    return { ok: false, erro: "Não foi possível identificar por aqui. Entre pela página Entrar ou fale com a equipe." };
  }
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkErr || !link?.properties?.hashed_token) return { ok: false, erro: "Não foi possível concluir agora. Tente de novo." };
  await admin.from("chat_conversas").update({ paciente_id: pacienteId, paciente_sugerido_id: null }).eq("id", conversaId);
  return { ok: true, token_hash: link.properties.hashed_token, email, paciente_id: pacienteId!, nome };
}
