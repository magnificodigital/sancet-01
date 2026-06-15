import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSacola } from "@/stores/sacola";
import { formatBRL, precoItemReais } from "@/lib/preco";
import { Unidade } from "./ListaUnidades";
import { EnderecoColeta } from "./EtapaEndereco";
import { Agendamento } from "./EtapaAgendamento";
import { formatarAgendamento } from "@/lib/agendamento";
import {
  AlertTriangle,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  FileText,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Convenio = { id: string; nome: string; codigo_shift: string };
type Plano = { codigo_item: string; descricao: string };

type ConvenioSelecionado = {
  id: string;
  nome: string;
  codigo_shift: string;
} | null;

type TipoDocumento = "rg" | "certidao";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/jpg,application/pdf";

type ConvenioPreset = {
  id: string;
  nome: string;
  codigo_shift: string;
  planoCodigo: string | null;
  planoDescricao: string | null;
  numeroCarteirinha: string;
} | null;

type Props = {
  tipo: "particular" | "convenio";
  modalidade: "domicilio" | "unidade";
  unidade: Unidade | null;
  endereco: EnderecoColeta | null;
  agendamento: Agendamento | null;
  enviando: boolean;
  convenioPreset?: ConvenioPreset;
  onConfirmar: (extras: {
    numeroCarteirinha: string;
    convenioId: string | null;
    convenioNome: string;
    convenioCodigoShift: string | null;
    planoCodigo: string | null;
    planoDescricao: string | null;
    arquivoCarteirinha: File | null;
    arquivoPedidoMedico: File | null;
    arquivoRgFrente: File | null;
    arquivoRgVerso: File | null;
    arquivoCertidao: File | null;
    arquivoRelatorioMedico: File | null;
    tipoDocumentoIdentidade: TipoDocumento;
    deficiencias: string;
  }) => void;
};

type UploadFieldProps = {
  id: string;
  label: string;
  helper?: string;
  file: File | null;
  onChange: (f: File | null) => void;
  required?: boolean;
  invalid?: boolean;
};

const UploadField = ({
  id,
  label,
  helper,
  file,
  onChange,
  required,
  invalid,
}: UploadFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const onPick = (f: File | null) => {
    if (!f) {
      onChange(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("Arquivo muito grande (máx. 10 MB).");
      return;
    }
    onChange(f);
  };
  return (
    <div
      id={id}
      className={cn(
        "rounded-lg border p-3 transition-colors",
        invalid ? "border-red-500 bg-red-50/40" : "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Label className="text-sm">
            {label} {required && <span className="text-[#C8102E]">*</span>}
          </Label>
          {helper && (
            <p className="mt-0.5 text-xs text-muted-foreground">{helper}</p>
          )}
        </div>
        {file && (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />

      {file ? (
        <div className="mt-2 flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate flex-1">{file.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => inputRef.current?.click()}
          >
            Trocar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-600 hover:text-red-700"
            onClick={() => onChange(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 w-full justify-center gap-2"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          Anexar arquivo
        </Button>
      )}
    </div>
  );
};

export const EtapaConfirmacao = ({
  tipo,
  modalidade,
  unidade,
  endereco,
  agendamento,
  enviando,
  onConfirmar,
}: Props & { convenioPreset?: ConvenioPreset }) => {
  const { itens } = useSacola();
  const [numeroCarteirinha, setNumeroCarteirinha] = useState(
    convenioPreset?.numeroCarteirinha ?? "",
  );
  const [arquivoCarteirinha, setArquivoCarteirinha] = useState<File | null>(null);
  const [arquivoPedidoMedico, setArquivoPedidoMedico] = useState<File | null>(null);
  const [arquivoRgFrente, setArquivoRgFrente] = useState<File | null>(null);
  const [arquivoRgVerso, setArquivoRgVerso] = useState<File | null>(null);
  const [arquivoCertidao, setArquivoCertidao] = useState<File | null>(null);
  const [arquivoRelatorioMedico, setArquivoRelatorioMedico] = useState<File | null>(null);
  const [tipoDoc, setTipoDoc] = useState<TipoDocumento>("rg");
  const [aceito, setAceito] = useState(false);
  const [deficiencias, setDeficiencias] = useState("");

  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [convSel, setConvSel] = useState<ConvenioSelecionado>(null);
  const [convOpen, setConvOpen] = useState(false);
  const [convQuery, setConvQuery] = useState("");

  const [planos, setPlanos] = useState<Plano[]>([]);
  const [planosCarregando, setPlanosCarregando] = useState(false);
  const [planoSel, setPlanoSel] = useState<Plano | null>(null);
  const [planoOpen, setPlanoOpen] = useState(false);
  const [planoQuery, setPlanoQuery] = useState("");

  const [erros, setErros] = useState<string[]>([]);
  const [modalErros, setModalErros] = useState<{ label: string; id: string }[]>([]);
  const [showErros, setShowErros] = useState(false);

  useEffect(() => {
    if (tipo !== "convenio") return;
    supabase
      .from("convenios_cache")
      .select("id,nome,codigo_shift")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => setConvenios((data as Convenio[]) ?? []));
  }, [tipo]);

  useEffect(() => {
    setPlanoSel(null);
    setPlanos([]);
    if (!convSel) return;
    setPlanosCarregando(true);
    supabase
      .from("convenios_planos")
      .select("codigo_item,descricao")
      .eq("convenio_id", convSel.id)
      .eq("ativo", true)
      .order("codigo_item")
      .then(({ data }) => {
        setPlanos((data as Plano[]) ?? []);
        setPlanosCarregando(false);
      });
  }, [convSel]);

  const conveniosFiltrados = useMemo(() => {
    const q = convQuery.trim().toLowerCase();
    const base = q
      ? convenios.filter((c) => c.nome.toLowerCase().includes(q))
      : convenios;
    return base.slice(0, 8);
  }, [convenios, convQuery]);

  const planosFiltrados = useMemo(() => {
    const q = planoQuery.trim().toLowerCase();
    if (!q) return planos.slice(0, 8);
    return planos
      .filter(
        (p) =>
          p.codigo_item.toLowerCase().includes(q) ||
          p.descricao.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [planos, planoQuery]);

  const exigePlano = planos.length > 0;

  const totalParticular = itens.reduce((acc, i) => acc + (precoItemReais(i) ?? 0), 0);

  const validar = (): { label: string; id: string }[] => {
    const faltas: { label: string; id: string }[] = [];

    if (tipoDoc === "rg") {
      if (!arquivoRgFrente) faltas.push({ label: "RG — Frente", id: "doc-rg-frente" });
      if (!arquivoRgVerso) faltas.push({ label: "RG — Verso", id: "doc-rg-verso" });
    } else {
      if (!arquivoCertidao)
        faltas.push({ label: "Certidão de Nascimento", id: "doc-certidao" });
    }

    if (!arquivoPedidoMedico)
      faltas.push({ label: "Pedido médico", id: "doc-pedido-medico" });

    if (tipo === "convenio") {
      if (!convSel) faltas.push({ label: "Convênio", id: "campo-convenio" });
      if (exigePlano && !planoSel)
        faltas.push({ label: "Plano do convênio", id: "campo-plano" });
      if (!numeroCarteirinha.trim())
        faltas.push({ label: "Número da carteirinha", id: "campo-numero-carteirinha" });
      if (!arquivoCarteirinha)
        faltas.push({ label: "Carteirinha do convênio", id: "doc-carteirinha" });
    }

    if (!aceito) faltas.push({ label: "Aceitar os termos de uso", id: "campo-termos" });

    return faltas;
  };

  const handleConfirmar = () => {
    const faltas = validar();
    if (faltas.length > 0) {
      setErros(faltas.map((f) => f.id));
      setModalErros(faltas);
      setShowErros(true);
      return;
    }
    setErros([]);
    onConfirmar({
      numeroCarteirinha,
      convenioId: convSel?.id ?? null,
      convenioNome: convSel?.nome ?? "",
      convenioCodigoShift: convSel?.codigo_shift ?? null,
      planoCodigo: planoSel?.codigo_item ?? null,
      planoDescricao: planoSel?.descricao ?? null,
      arquivoCarteirinha,
      arquivoPedidoMedico,
      arquivoRgFrente: tipoDoc === "rg" ? arquivoRgFrente : null,
      arquivoRgVerso: tipoDoc === "rg" ? arquivoRgVerso : null,
      arquivoCertidao: tipoDoc === "certidao" ? arquivoCertidao : null,
      arquivoRelatorioMedico,
      tipoDocumentoIdentidade: tipoDoc,
      deficiencias: deficiencias.trim(),
    });
  };

  const fecharModalErros = () => {
    setShowErros(false);
    const primeiro = modalErros[0];
    if (primeiro) {
      setTimeout(() => {
        const el = document.getElementById(primeiro.id);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  };

  const hasErr = (id: string) => erros.includes(id);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-secondary">Confirmar pedido</h1>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <h3 className="font-semibold mb-2 text-secondary">Itens</h3>
          <ul className="space-y-2 text-sm">
            {itens.map((i) => (
              <li key={i.codigoShift} className="space-y-0.5">
                <div className="flex justify-between gap-2 items-center">
                  <span className="truncate">
                    {i.codigoShift}-{i.nome}
                  </span>
                  {tipo === "convenio" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 shrink-0">
                      <ShieldCheck className="h-3 w-3" />
                      Coberto pelo convênio
                    </span>
                  ) : (
                    <span className="whitespace-nowrap text-muted-foreground">
                      {formatBRL(precoItemReais(i))}
                    </span>
                  )}
                </div>
                {tipo === "convenio" && (
                  <p className="text-[11px] text-muted-foreground">
                    Sujeito à autorização da operadora
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="text-sm space-y-1 border-t pt-3">
          <p>
            <span className="text-muted-foreground">Tipo:</span>{" "}
            <span className="font-medium">{tipo === "convenio" ? "Convênio" : "Particular"}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Modalidade:</span>{" "}
            <span className="font-medium">
              {modalidade === "domicilio"
                ? "Em casa"
                : `Unidade ${unidade?.nome ?? ""}`}
            </span>
          </p>
          {modalidade === "domicilio" && endereco && (
            <p className="text-muted-foreground">
              {endereco.logradouro}, {endereco.numero} — {endereco.bairro}, {endereco.cidade}/{endereco.uf}
            </p>
          )}
        </div>

        {agendamento && modalidade === "unidade" && (
          <div className="flex items-start gap-2 rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 p-3">
            <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#C8102E]" />
            <p className="text-sm text-secondary">
              {formatarAgendamento(agendamento.data, agendamento.periodo)}
            </p>
          </div>
        )}

        <div className="border-t pt-3">
          {tipo === "convenio" ? (
            <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
              Valor coberto pelo plano. Eventuais coparticipações são informadas
              pela operadora no momento do atendimento.
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-bold text-[#C8102E]">
                {formatBRL(totalParticular)}
              </span>
            </div>
          )}
        </div>
      </div>

      {tipo === "convenio" && (
        <div className="space-y-3">
          <div id="campo-convenio">
            <Label>Convênio</Label>
            <Popover open={convOpen} onOpenChange={setConvOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full justify-between font-normal",
                    hasErr("campo-convenio") && "border-red-500",
                  )}
                >
                  <span className={cn(!convSel && "text-muted-foreground")}>
                    {convSel ? convSel.nome : "Selecione o convênio"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="p-0 w-[--radix-popover-trigger-width] pointer-events-auto"
                align="start"
              >
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Buscar convênio..."
                    value={convQuery}
                    onValueChange={setConvQuery}
                  />
                  <CommandList>
                    <CommandEmpty>Nenhum convênio encontrado.</CommandEmpty>
                    <CommandGroup>
                      {conveniosFiltrados.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.id}
                          onSelect={() => {
                            setConvSel(c);
                            setConvOpen(false);
                            setConvQuery("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              convSel?.id === c.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {c.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-700" />
            <p>
              <strong>ATENÇÃO!</strong> Para evitar qualquer transtorno, verifique se o seu Plano
              de Saúde cobre o(s) exame(s) que deseja realizar. Cada convênio possui um prazo
              distinto e dinâmica de aprovação diferente, o que pode levar alguns dias.
              Lembramos que o prazo de aprovação e cobertura é de total responsabilidade do Plano
              de Saúde.
            </p>
          </div>

          {convSel && (
            <div id="campo-plano">
              <Label>Plano</Label>
              {planosCarregando ? (
                <p className="text-xs text-muted-foreground mt-1">Carregando planos...</p>
              ) : exigePlano ? (
                <Popover open={planoOpen} onOpenChange={setPlanoOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between font-normal",
                        hasErr("campo-plano") && "border-red-500",
                      )}
                    >
                      <span className={cn(!planoSel && "text-muted-foreground")}>
                        {planoSel
                          ? `${planoSel.codigo_item} — ${planoSel.descricao}`
                          : "Selecione o plano"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0 w-[--radix-popover-trigger-width] pointer-events-auto"
                    align="start"
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Buscar plano (código ou descrição)..."
                        value={planoQuery}
                        onValueChange={setPlanoQuery}
                      />
                      <CommandList>
                        <CommandEmpty>Nenhum plano encontrado.</CommandEmpty>
                        <CommandGroup>
                          {planosFiltrados.map((p) => (
                            <CommandItem
                              key={p.codigo_item}
                              value={p.codigo_item}
                              onSelect={() => {
                                setPlanoSel(p);
                                setPlanoOpen(false);
                                setPlanoQuery("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  planoSel?.codigo_item === p.codigo_item
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              <span className="font-mono mr-2">{p.codigo_item}</span>
                              <span className="truncate">{p.descricao}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Este convênio não exige seleção de plano.
                </p>
              )}
            </div>
          )}

          <div id="campo-numero-carteirinha">
            <Label>Número da carteirinha</Label>
            <Input
              value={numeroCarteirinha}
              onChange={(e) => setNumeroCarteirinha(e.target.value)}
              className={cn(hasErr("campo-numero-carteirinha") && "border-red-500")}
            />
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-secondary">Documentos</h3>
          <p className="mt-1 text-sm text-orange-700">
            <strong>ATENÇÃO!</strong> Assim como os dados cadastrados, todos os documentos
            anexados devem pertencer à pessoa que será atendida.
          </p>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold">Documento de identidade</Label>
          <RadioGroup
            value={tipoDoc}
            onValueChange={(v) => setTipoDoc(v as TipoDocumento)}
            className="flex gap-4"
          >
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <RadioGroupItem value="rg" id="tipo-rg" />
              RG
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <RadioGroupItem value="certidao" id="tipo-certidao" />
              Certidão de Nascimento
            </label>
          </RadioGroup>

          {tipoDoc === "rg" ? (
            <div className="space-y-2">
              <UploadField
                id="doc-rg-frente"
                label="RG — Frente"
                file={arquivoRgFrente}
                onChange={setArquivoRgFrente}
                required
                invalid={hasErr("doc-rg-frente")}
              />
              <UploadField
                id="doc-rg-verso"
                label="RG — Verso"
                file={arquivoRgVerso}
                onChange={setArquivoRgVerso}
                required
                invalid={hasErr("doc-rg-verso")}
              />
            </div>
          ) : (
            <UploadField
              id="doc-certidao"
              label="Certidão de Nascimento"
              file={arquivoCertidao}
              onChange={setArquivoCertidao}
              required
              invalid={hasErr("doc-certidao")}
            />
          )}
        </div>

        <UploadField
          id="doc-pedido-medico"
          label="Pedido médico"
          helper="Envie o pedido médico em PDF ou imagem. Atenção à qualidade e legibilidade."
          file={arquivoPedidoMedico}
          onChange={setArquivoPedidoMedico}
          required
          invalid={hasErr("doc-pedido-medico")}
        />

        <UploadField
          id="doc-relatorio-medico"
          label="Relatório médico (opcional)"
          helper="Envie um relatório médico complementar, se houver."
          file={arquivoRelatorioMedico}
          onChange={setArquivoRelatorioMedico}
        />

        {tipo === "convenio" && (
          <UploadField
            id="doc-carteirinha"
            label="Carteirinha do convênio"
            file={arquivoCarteirinha}
            onChange={setArquivoCarteirinha}
            required
            invalid={hasErr("doc-carteirinha")}
          />
        )}
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div>
          <h3 className="font-semibold text-secondary">Dados Pessoais</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Preencha o formulário abaixo com os dados da pessoa que irá realizar o(s) exame(s).
            Não use seus dados se você está preenchendo para outra pessoa.
          </p>
        </div>

        <div>
          <Label htmlFor="deficiencias">Necessidades especiais (opcional)</Label>
          <Textarea
            id="deficiencias"
            value={deficiencias}
            onChange={(e) => setDeficiencias(e.target.value.slice(0, 500))}
            maxLength={500}
            placeholder="Ex.: cadeirante, baixa visão, surdez..."
            className="mt-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Caso possua alguma deficiência (física, auditiva, visual ou intelectual),
            descreva para que possamos preparar o melhor atendimento.
          </p>
        </div>
      </div>

      <label
        id="campo-termos"
        className={cn(
          "flex items-start gap-3 text-sm rounded-lg p-2",
          hasErr("campo-termos") && "ring-1 ring-red-500 bg-red-50/40",
        )}
      >
        <Checkbox
          checked={aceito}
          onCheckedChange={(v) => setAceito(v === true)}
          className="mt-0.5"
        />
        <span className="text-muted-foreground">
          Concordo com os <span className="text-[#C8102E] underline">Termos de uso</span> e
          autorizo o tratamento dos meus dados conforme a LGPD.
        </span>
      </label>

      <Button
        disabled={enviando}
        onClick={handleConfirmar}
        className="w-full bg-[#C8102E] hover:bg-[#a80d26] text-white"
      >
        {enviando ? "Enviando..." : "Confirmar pedido"}
      </Button>

      <Dialog open={showErros} onOpenChange={setShowErros}>
        <DialogContent className="border-red-300">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Por favor, revise o formulário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>Alguns campos obrigatórios não foram preenchidos:</p>
            <ul className="list-disc pl-5 space-y-1">
              {modalErros.map((e) => (
                <li key={e.id} className="text-red-700">{e.label}</li>
              ))}
            </ul>
            <p className="text-muted-foreground pt-2">
              Toque em FECHAR e role a página para preenchê-los. Os campos faltantes aparecem
              destacados em vermelho.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={fecharModalErros}
              className="bg-[#C8102E] hover:bg-[#a80d26] text-white w-full"
            >
              FECHAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
