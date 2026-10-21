import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, CheckCircle2, Copy, CreditCard, FileText, Loader2, LogIn, MapPin, QrCode, Search, Upload, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { type Plano } from "@/components/convenio/SeletorPlano";
import { cn } from "@/lib/utils";

const db = supabase as any;

export type AcoesAgendamento = {
  passo: (campo: string, valor: unknown, rotulo: string) => Promise<void>;
  documento: (chave: string, arquivo: File) => Promise<void>;
  confirmar: (dados: { deficiencias: string; salvar_convenio: boolean; tipo_documento: string }) => Promise<void>;
  pagar: (protocolo: string, metodo: string) => Promise<any>;
};

const Botao = ({ children, onClick, disabled, primario = false, className }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; primario?: boolean; className?: string }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-50",
      primario ? "bg-brand-2 text-white hover:bg-[#162f58]" : "border bg-white text-secondary hover:bg-muted",
      className,
    )}
  >
    {children}
  </button>
);

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Cartões interativos do agendamento pelo chat (mesmas etapas do site).
 * `ativo` = é o cartão da última mensagem; os antigos ficam só para consulta.
 */
export const CartaoAgendamento = ({ acao, ativo, fn }: { acao: any; ativo: boolean; fn: AcoesAgendamento }) => {
  const navigate = useNavigate();
  const [ocupado, setOcupado] = useState(false);
  const exec = async (f: () => Promise<unknown>) => {
    if (ocupado) return;
    setOcupado(true);
    try {
      await f();
    } finally {
      setOcupado(false);
    }
  };
  const travado = !ativo || ocupado;
  const wrap = (children: React.ReactNode) => (
    <div className={cn("mt-2 space-y-2 rounded-xl border bg-muted/30 p-2.5 text-secondary", !ativo && "opacity-60")}>
      {children}
      {ativo && acao.pode_voltar && (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => exec(() => fn.passo("voltar", acao.tipo, "‹ Voltar para corrigir"))}
          className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-secondary hover:underline disabled:opacity-50"
        >
          ‹ Voltar
        </button>
      )}
      {ocupado && (
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Processando...
        </p>
      )}
    </div>
  );

  switch (acao.tipo) {
    case "login":
      return wrap(
        <>
          <div className="grid grid-cols-2 gap-2">
            <Botao primario disabled={!ativo} onClick={() => navigate(`/entrar?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)}>
              <LogIn className="mr-1 inline h-3.5 w-3.5" /> Entrar
            </Botao>
            <Botao disabled={!ativo} onClick={() => navigate("/cadastro")}>
              <UserPlus className="mr-1 inline h-3.5 w-3.5" /> Criar conta
            </Botao>
          </div>
          <Botao disabled={travado} className="w-full" onClick={() => exec(() => fn.passo("iniciar", null, "Já entrei na minha conta"))}>
            Já entrei — continuar
          </Botao>
        </>,
      );

    case "escolher_tipo":
      return wrap(
        <div className="grid grid-cols-2 gap-2">
          {(acao.opcoes ?? []).map((o: string) => (
            <Botao key={o} primario disabled={travado} onClick={() => exec(() => fn.passo("tipo", o, o === "convenio" ? "Pelo convênio" : "Particular"))}>
              {o === "convenio" ? "Convênio" : "Particular"}
            </Botao>
          ))}
        </div>,
      );

    case "convenio":
      return wrap(<EscolherConvenio salvos={acao.salvos ?? []} buscaInicial={acao.busca ?? ""} travado={travado} exec={exec} fn={fn} />);

    case "plano":
      return wrap(<EscolherPlano convenioId={acao.convenio_id} buscaInicial={acao.busca ?? ""} travado={travado} exec={exec} fn={fn} />);

    case "carteirinha":
      return wrap(<CampoTexto rotulo="Número da carteirinha" travado={travado} onEnviar={(v) => exec(() => fn.passo("carteirinha", v, `Carteirinha: ${v}`))} />);

    case "modalidade":
      return wrap(
        <div className="grid grid-cols-2 gap-2">
          <Botao primario disabled={travado} onClick={() => exec(() => fn.passo("modalidade", "unidade", "Vou a uma unidade"))}>
            Ir a uma unidade
          </Botao>
          <Botao disabled={travado} onClick={() => exec(() => fn.passo("modalidade", "domicilio", "Coleta em casa"))}>
            Coleta em casa
          </Botao>
        </div>,
      );

    case "unidade":
      return wrap(
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {(acao.opcoes ?? []).map((u: any) => (
            <button
              key={u.codigo_shift}
              type="button"
              disabled={travado}
              onClick={() => exec(() => fn.passo("unidade", u.codigo_shift, `Unidade: ${u.nome}`))}
              className="flex w-full items-center gap-2 rounded-lg border bg-white px-2.5 py-1.5 text-left text-xs hover:bg-muted disabled:opacity-50"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-brand" />
              <span className="flex-1 font-medium">{u.nome}</span>
              <span className="text-[10px] text-muted-foreground">{[u.bairro, u.cidade].filter(Boolean).join(" · ")}</span>
            </button>
          ))}
        </div>,
      );

    case "datas":
      return wrap(
        <div className="grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto">
          {(acao.opcoes ?? []).map((d: any) => (
            <div key={d.data} className="rounded-lg border bg-white p-1.5">
              <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold capitalize">
                <CalendarDays className="h-3 w-3 text-brand" /> {d.rotulo}
              </p>
              <div className="flex gap-1">
                {d.manha && (
                  <button
                    type="button"
                    disabled={travado}
                    onClick={() => exec(() => fn.passo("data", { data: d.data, periodo: "manha" }, `${d.rotulo} — manhã`))}
                    className="flex-1 rounded bg-brand-2/10 px-1 py-1 text-[10px] font-semibold text-brand-2 hover:bg-brand-2/20 disabled:opacity-50"
                  >
                    Manhã
                  </button>
                )}
                {d.tarde && (
                  <button
                    type="button"
                    disabled={travado}
                    onClick={() => exec(() => fn.passo("data", { data: d.data, periodo: "tarde" }, `${d.rotulo} — tarde`))}
                    className="flex-1 rounded bg-brand-2/10 px-1 py-1 text-[10px] font-semibold text-brand-2 hover:bg-brand-2/20 disabled:opacity-50"
                  >
                    Tarde
                  </button>
                )}
              </div>
            </div>
          ))}
          <p className="col-span-2 text-[10px] text-muted-foreground">Manhã: 6h às 12h · Tarde: 12h às 16h</p>
        </div>,
      );

    case "endereco":
      return wrap(<FormEndereco sugestao={acao.sugestao ?? {}} travado={travado} onEnviar={(e) => exec(() => fn.passo("endereco", e, `Endereço: ${e.logradouro}, ${e.numero} — ${e.bairro}`))} />);

    case "documentos":
      return wrap(
        <>
          <Documentos itens={acao.itens ?? []} tipoDoc={acao.tipo_documento ?? "rg"} travado={travado} exec={exec} fn={fn} />
          {acao.pode_continuar && (
            <Botao primario className="w-full" disabled={travado} onClick={() => exec(() => fn.passo("docs_ok", true, "Documentos conferidos"))}>
              Tudo certo, continuar
            </Botao>
          )}
        </>,
      );

    case "confirmar_agendamento":
      return wrap(<Confirmacao resumo={acao.resumo ?? {}} travado={travado} exec={exec} fn={fn} />);

    case "pagamento":
      return wrap(<Pagar protocolo={acao.protocolo} valorCentavos={acao.valor_centavos} ativo={ativo} fn={fn} />);

    case "pedido_criado":
      return wrap(
        <>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
            <CheckCircle2 className="h-4 w-4" /> Pedido {acao.protocolo}
          </p>
          <Botao primario className="w-full" onClick={() => navigate("/agendamentos")}>
            Ver meus agendamentos
          </Botao>
        </>,
      );
  }
  return null;
};

// ---------- partes ----------

const CampoTexto = ({ rotulo, travado, onEnviar }: { rotulo: string; travado: boolean; onEnviar: (v: string) => void }) => {
  const [v, setV] = useState("");
  return (
    <div className="flex gap-1.5">
      <input
        value={v}
        disabled={travado}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && v.trim() && onEnviar(v.trim())}
        placeholder={rotulo}
        className="min-w-0 flex-1 rounded-lg border px-2.5 py-1.5 text-xs outline-none focus:border-brand"
      />
      <Botao primario disabled={travado || !v.trim()} onClick={() => onEnviar(v.trim())}>
        OK
      </Botao>
    </div>
  );
};

const EscolherConvenio = ({ salvos, buscaInicial, travado, exec, fn }: { salvos: any[]; buscaInicial: string; travado: boolean; exec: (f: () => Promise<unknown>) => void; fn: AcoesAgendamento }) => {
  const [lista, setLista] = useState<{ id: string; nome: string }[]>([]);
  const [q, setQ] = useState(buscaInicial);
  useEffect(() => {
    db.from("convenios_cache").select("id, nome").eq("ativo", true).order("nome").then(({ data }: any) => setLista(data ?? []));
  }, []);
  const filtrados = useMemo(() => filtrarPorPalavras(lista, q, (c) => c.nome), [lista, q]);
  return (
    <>
      {salvos.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Salvos na sua conta</p>
          {salvos.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={travado}
              onClick={() => exec(() => fn.passo("convenio_salvo", s.id, `Usar meu convênio ${s.convenio_nome}`))}
              className="flex w-full items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-left text-xs hover:bg-green-100 disabled:opacity-50"
            >
              <CreditCard className="h-3.5 w-3.5 text-green-700" />
              <span className="flex-1">
                <b>{s.convenio_nome}</b>
                {s.plano_descricao && <span className="block text-[10px] text-muted-foreground">{s.plano_descricao}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={q}
          disabled={travado}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar convênio"
          className="w-full rounded-lg border py-1.5 pl-7 pr-2 text-xs outline-none focus:border-brand"
        />
      </div>
      <div className="max-h-44 space-y-0.5 overflow-y-auto">
        {filtrados.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={travado}
            onClick={() => exec(() => fn.passo("convenio", c.id, `Convênio: ${c.nome}`))}
            className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-white disabled:opacity-50"
          >
            {c.nome}
          </button>
        ))}
        {!filtrados.length && <p className="px-2 py-1 text-[11px] text-muted-foreground">Não encontrado na lista de convênios aceitos.</p>}
      </div>
    </>
  );
};

const EscolherPlano = ({ convenioId, buscaInicial, travado, exec, fn }: { convenioId: string; buscaInicial: string; travado: boolean; exec: (f: () => Promise<unknown>) => void; fn: AcoesAgendamento }) => {
  const [planos, setPlanos] = useState<Plano[] | null>(null);
  const [q, setQ] = useState(buscaInicial);
  useEffect(() => {
    db.from("convenios_planos").select("codigo_item, descricao").eq("convenio_id", convenioId).eq("ativo", true).limit(1000).then(({ data }: any) => setPlanos(data ?? []));
  }, [convenioId]);
  const ordenados = useMemo(
    () => [...(planos ?? [])].sort((a, b) => a.descricao.localeCompare(b.descricao, "pt-BR", { numeric: true })),
    [planos],
  );
  const filtrados = useMemo(() => filtrarPorPalavras(ordenados, q, (p) => p.descricao), [ordenados, q]);
  if (!planos) return <p className="text-[11px] text-muted-foreground">Carregando planos...</p>;
  return (
    <>
      <div className="relative">
        <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={q}
          disabled={travado}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Digite o nome do plano (está na carteirinha)"
          className="w-full rounded-lg border py-1.5 pl-7 pr-2 text-xs outline-none focus:border-brand"
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        {filtrados.length} de {planos.length} planos{filtrados.length > 80 ? " — digite para filtrar" : ""}
      </p>
      <div className="max-h-52 space-y-0.5 overflow-y-auto">
        {filtrados.slice(0, 80).map((p) => (
          <button
            key={p.codigo_item}
            type="button"
            disabled={travado}
            onClick={() => exec(() => fn.passo("plano", p.codigo_item, `Plano: ${p.descricao}`))}
            className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-white disabled:opacity-50"
          >
            {p.descricao}
          </button>
        ))}
        {!filtrados.length && <p className="px-2 py-1 text-[11px] text-muted-foreground">Nenhum plano com esse nome. Tente outra palavra da carteirinha.</p>}
      </div>
    </>
  );
};

/** Filtro sem acento e por palavras em qualquer ordem (igual ao servidor). */
function filtrarPorPalavras<T>(lista: T[], termo: string, nome: (x: T) => string): T[] {
  const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const palavras = norm(termo).split(/[^a-z0-9]+/).filter((w) => w.length >= 2);
  if (!palavras.length) return lista;
  return lista.filter((x) => {
    const n = norm(nome(x));
    return palavras.every((w) => n.includes(w));
  });
}

const FormEndereco = ({ sugestao, travado, onEnviar }: { sugestao: any; travado: boolean; onEnviar: (e: any) => void }) => {
  const [e, setE] = useState({
    cep: sugestao.cep ?? "",
    logradouro: sugestao.logradouro ?? "",
    numero: sugestao.numero ?? "",
    complemento: sugestao.complemento ?? "",
    bairro: sugestao.bairro ?? "",
    cidade: sugestao.cidade ?? "",
    uf: sugestao.uf ?? "",
  });
  const campo = (k: keyof typeof e, ph: string, cls = "") => (
    <input value={e[k]} disabled={travado} onChange={(ev) => setE({ ...e, [k]: ev.target.value })} placeholder={ph} className={cn("rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-brand", cls)} />
  );
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {campo("cep", "CEP")}
      {campo("logradouro", "Rua", "col-span-2")}
      {campo("numero", "Número")}
      {campo("complemento", "Complemento", "col-span-2")}
      {campo("bairro", "Bairro")}
      {campo("cidade", "Cidade")}
      {campo("uf", "UF")}
      <Botao primario className="col-span-3" disabled={travado || !e.logradouro || !e.numero || !e.bairro || !e.cidade} onClick={() => onEnviar(e)}>
        Confirmar endereço
      </Botao>
    </div>
  );
};

const Documentos = ({ itens, tipoDoc, travado, exec, fn }: { itens: any[]; tipoDoc: string; travado: boolean; exec: (f: () => Promise<unknown>) => void; fn: AcoesAgendamento }) => {
  const ref = useRef<HTMLInputElement>(null);
  const alvo = useRef<string>("");
  const escolher = (chave: string) => {
    alvo.current = chave;
    ref.current?.click();
  };
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (f.size > MAX_BYTES) return toast.error("Arquivo muito grande (máx. 10 MB).");
          exec(() => fn.documento(alvo.current, f));
        }}
      />
      {itens.some((i) => i.chave === "rg_frente") && (
        <div className="flex items-center gap-1.5 text-[11px]">
          Documento com foto:
          {(["rg", "cnh"] as const).map((t) => (
            <button
              key={t}
              type="button"
              disabled={travado}
              onClick={() => exec(() => fn.passo("tipo_documento", t, t === "rg" ? "Vou enviar o RG" : "Vou enviar a CNH"))}
              className={cn("rounded-full border px-2 py-0.5", tipoDoc === t ? "border-brand-2 bg-brand-2 text-white" : "bg-white")}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-1">
        {itens.map((i) => (
          <div key={i.chave} className="flex items-center gap-2 rounded-lg border bg-white px-2.5 py-1.5 text-xs">
            {i.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" /> : <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />}
            <span className={cn("flex-1", i.ok && "text-green-800")}>
              {i.rotulo}
              {i.multiplo && i.qtd > 0 && <span className="text-muted-foreground"> ({i.qtd})</span>}
            </span>
            {(!i.ok || i.multiplo || i.ok) && (
              <button
                type="button"
                disabled={travado}
                onClick={() => escolher(i.chave)}
                className="flex items-center gap-1 rounded-md bg-brand-2 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
              >
                <Upload className="h-3 w-3" /> {!i.ok ? "Enviar" : i.multiplo ? "Mais um" : "Trocar"}
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">Foto nítida ou PDF, até 10 MB. Seus documentos ficam protegidos (LGPD).</p>
    </>
  );
};

const Confirmacao = ({ resumo, travado, exec, fn }: { resumo: any; travado: boolean; exec: (f: () => Promise<unknown>) => void; fn: AcoesAgendamento }) => {
  const [aceito, setAceito] = useState(false);
  const [salvar, setSalvar] = useState(resumo.salvar_convenio ?? true);
  const [def, setDef] = useState("");
  const editaveis: string[] = resumo.editaveis ?? [];
  const linha = (k: string, v: any, campo?: string) =>
    v ? (
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1">
          <span className="text-muted-foreground">{k}:</span> <b>{Array.isArray(v) ? v.join(", ") : v}</b>
        </p>
        {campo && editaveis.includes(campo) && (
          <button
            type="button"
            disabled={travado}
            onClick={() => exec(() => fn.passo("editar", campo, `Quero alterar: ${k.toLowerCase()}`))}
            className="shrink-0 text-[10px] font-semibold text-brand underline-offset-2 hover:underline disabled:opacity-50"
          >
            Alterar
          </button>
        )}
      </div>
    ) : null;
  return (
    <>
      <div className="space-y-0.5 rounded-lg bg-white p-2 text-[11px]">
        {linha("Paciente", resumo.paciente)}
        {linha("Atendimento", resumo.tipo === "convenio" ? "Convênio" : "Particular", "tipo")}
        {linha("Convênio", resumo.convenio, "convenio")}
        {linha("Plano", resumo.plano, "plano")}
        {linha("Carteirinha", resumo.carteirinha, "carteirinha")}
        {linha("Exames", resumo.exames?.length ? resumo.exames : resumo.exames_ia?.length ? resumo.exames_ia : "conforme o pedido médico")}
        {linha("Total", resumo.total)}
        {linha("Onde", resumo.onde, editaveis.includes("unidade") ? "unidade" : editaveis.includes("endereco") ? "endereco" : "modalidade")}
        {linha("Quando", resumo.quando, "data")}
        {linha("Documentos", resumo.documentos, "documentos")}
      </div>
      <textarea
        value={def}
        disabled={travado}
        onChange={(e) => setDef(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Necessidades especiais (opcional) — ex.: cadeirante, deficiência auditiva"
        className="w-full resize-none rounded-lg border px-2 py-1.5 text-[11px] outline-none focus:border-brand"
      />
      {resumo.tipo === "convenio" && (
        <label className="flex items-start gap-1.5 text-[11px]">
          <input type="checkbox" checked={salvar} disabled={travado} onChange={(e) => setSalvar(e.target.checked)} className="mt-0.5" />
          Salvar convênio e carteirinha na minha conta para os próximos pedidos
        </label>
      )}
      <label className="flex items-start gap-1.5 text-[11px]">
        <input type="checkbox" checked={aceito} disabled={travado} onChange={(e) => setAceito(e.target.checked)} className="mt-0.5" />
        <span>
          Concordo com os{" "}
          <a href="/politica-de-privacidade" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline">
            Termos de uso
          </a>{" "}
          e autorizo o tratamento dos meus dados conforme a LGPD.
        </span>
      </label>
      <Botao
        primario
        className="w-full"
        disabled={travado || !aceito}
        onClick={() => exec(() => fn.confirmar({ deficiencias: def.trim(), salvar_convenio: salvar, tipo_documento: resumo.tipo_documento ?? "rg" }))}
      >
        <Check className="mr-1 inline h-3.5 w-3.5" /> Confirmar e enviar pedido
      </Botao>
    </>
  );
};

const Pagar = ({ protocolo, valorCentavos, ativo, fn }: { protocolo: string; valorCentavos: number; ativo: boolean; fn: AcoesAgendamento }) => {
  const [dados, setDados] = useState<any>(null);
  const [carregando, setCarregando] = useState<string | null>(null);
  const gerar = async (metodo: string) => {
    setCarregando(metodo);
    const d = await fn.pagar(protocolo, metodo).catch(() => null);
    setCarregando(null);
    if (!d) return;
    if (metodo !== "pix" && d.invoice_url) window.open(d.invoice_url, "_blank", "noopener");
    setDados(d);
  };
  return (
    <>
      <p className="text-xs">
        Valor: <b>{(valorCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b> · Pedido {protocolo}
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { m: "pix", r: "PIX" },
          { m: "cartao", r: "Cartão" },
          { m: "boleto", r: "Boleto" },
        ].map((x) => (
          <Botao key={x.m} primario={x.m === "pix"} disabled={!ativo || !!carregando} onClick={() => gerar(x.m)}>
            {carregando === x.m ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : x.r}
          </Botao>
        ))}
      </div>
      {dados?.pix && (
        <div className="space-y-1.5 rounded-lg bg-white p-2 text-center">
          {dados.pix.qr_code_base64 && <img src={`data:image/png;base64,${dados.pix.qr_code_base64}`} alt="QR Code PIX" className="mx-auto h-40 w-40" />}
          <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <QrCode className="h-3 w-3" /> PIX copia e cola:
          </p>
          <div className="flex items-center gap-1">
            <code className="min-w-0 flex-1 truncate rounded bg-muted px-1.5 py-1 text-[10px]">{dados.pix.pix_code}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(dados.pix.pix_code).then(() => toast.success("Código PIX copiado!"))}
              className="rounded p-1 hover:bg-muted"
              aria-label="Copiar código PIX"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">A confirmação do pagamento chega automaticamente.</p>
        </div>
      )}
      {dados && !dados.pix && dados.invoice_url && (
        <a href={dados.invoice_url} target="_blank" rel="noreferrer" className="block text-center text-xs font-semibold text-brand underline">
          Abrir página de pagamento
        </a>
      )}
    </>
  );
};
