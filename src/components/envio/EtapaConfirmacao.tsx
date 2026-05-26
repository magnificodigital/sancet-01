import { useEffect, useMemo, useState } from "react";
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
import { useSacola } from "@/stores/sacola";
import { formatBRL, precoItemReais } from "@/lib/preco";
import { Unidade } from "./ListaUnidades";
import { EnderecoColeta } from "./EtapaEndereco";
import { Agendamento } from "./EtapaAgendamento";
import { formatarAgendamento } from "@/lib/agendamento";
import { CalendarCheck, Check, ChevronsUpDown, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Convenio = { id: string; nome: string; codigo_shift: string };
type Plano = { codigo_item: string; descricao: string };

type ConvenioSelecionado = {
  id: string;
  nome: string;
  codigo_shift: string;
} | null;

type Props = {
  tipo: "particular" | "convenio";
  modalidade: "domicilio" | "unidade";
  unidade: Unidade | null;
  endereco: EnderecoColeta | null;
  agendamento: Agendamento | null;
  enviando: boolean;
  onConfirmar: (extras: {
    numeroCarteirinha: string;
    convenioId: string | null;
    convenioNome: string;
    convenioCodigoShift: string | null;
    planoCodigo: string | null;
    planoDescricao: string | null;
    arquivoCarteirinha: File | null;
  }) => void;
};

export const EtapaConfirmacao = ({
  tipo,
  modalidade,
  unidade,
  endereco,
  agendamento,
  enviando,
  onConfirmar,
}: Props) => {
  const { itens, total } = useSacola();
  const [numeroCarteirinha, setNumeroCarteirinha] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [aceito, setAceito] = useState(false);

  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [convSel, setConvSel] = useState<ConvenioSelecionado>(null);
  const [convOpen, setConvOpen] = useState(false);
  const [convQuery, setConvQuery] = useState("");

  const [planos, setPlanos] = useState<Plano[]>([]);
  const [planosCarregando, setPlanosCarregando] = useState(false);
  const [planoSel, setPlanoSel] = useState<Plano | null>(null);
  const [planoOpen, setPlanoOpen] = useState(false);
  const [planoQuery, setPlanoQuery] = useState("");

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

  const podeConfirmar =
    aceito &&
    !enviando &&
    (tipo !== "convenio" ||
      (!!convSel &&
        numeroCarteirinha.trim().length > 0 &&
        !!arquivo &&
        (!exigePlano || !!planoSel)));

  const totalParticular = itens.reduce((acc, i) => acc + (precoItemReais(i) ?? 0), 0);

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
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-bold text-[#C8102E]">
              {tipo === "convenio" ? formatBRL(0) : formatBRL(totalParticular)}
            </span>
          </div>
          {tipo === "convenio" && (
            <p className="mt-1 text-xs text-muted-foreground">
              Valor coberto pelo plano. Eventuais coparticipações são informadas pela operadora.
            </p>
          )}
        </div>
      </div>

      {tipo === "convenio" && (
        <div className="space-y-3">
          <div>
            <Label>Convênio</Label>
            <Popover open={convOpen} onOpenChange={setConvOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
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

          {convSel && (
            <div>
              <Label>Plano</Label>
              {planosCarregando ? (
                <p className="text-xs text-muted-foreground mt-1">Carregando planos...</p>
              ) : exigePlano ? (
                <Popover open={planoOpen} onOpenChange={setPlanoOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
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

          <div>
            <Label>Número da carteirinha</Label>
            <Input
              value={numeroCarteirinha}
              onChange={(e) => setNumeroCarteirinha(e.target.value)}
            />
          </div>
          <div>
            <Label>Carteirinha do convênio</Label>
            <Input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
      )}

      <label className="flex items-start gap-3 text-sm">
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
        disabled={!podeConfirmar}
        onClick={() =>
          onConfirmar({
            numeroCarteirinha,
            convenioId: convSel?.id ?? null,
            convenioNome: convSel?.nome ?? "",
            convenioCodigoShift: convSel?.codigo_shift ?? null,
            planoCodigo: planoSel?.codigo_item ?? null,
            planoDescricao: planoSel?.descricao ?? null,
            arquivoCarteirinha: arquivo,
          })
        }
        className="w-full bg-[#C8102E] hover:bg-[#a80d26] text-white"
      >
        {enviando ? "Enviando..." : "Confirmar pedido"}
      </Button>
    </div>
  );
};
