import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Check, ChevronsUpDown } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useSacola } from "@/stores/sacola";
import { cn } from "@/lib/utils";
import { CONVENIO_PULAR_CATALOGO } from "@/config/testeConvenio";

type Convenio = { id: string; nome: string; codigo_shift: string };
type Plano = { codigo_item: string; descricao: string };

const EscolherConvenio = () => {
  const navigate = useNavigate();
  const { setConvenio, setTipo } = useSacola();

  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [convSel, setConvSel] = useState<Convenio | null>(null);
  const [convOpen, setConvOpen] = useState(false);
  const [convQuery, setConvQuery] = useState("");

  const [planos, setPlanos] = useState<Plano[]>([]);
  const [planosCarregando, setPlanosCarregando] = useState(false);
  const [planoSel, setPlanoSel] = useState<Plano | null>(null);
  const [planoOpen, setPlanoOpen] = useState(false);
  const [planoQuery, setPlanoQuery] = useState("");

  const [carteirinha, setCarteirinha] = useState("");
  const [erros, setErros] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from("convenios_cache")
      .select("id,nome,codigo_shift")
      .eq("ativo", true)
      .limit(1000)
      .then(({ data }) => {
        const lista = ((data as Convenio[]) ?? []).slice().sort((a, b) =>
          a.nome.toLowerCase().localeCompare(b.nome.toLowerCase(), "pt-BR"),
        );
        setConvenios(lista);
      });
  }, []);

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
      .limit(1000)
      .then(({ data }) => {
        setPlanos((data as Plano[]) ?? []);
        setPlanosCarregando(false);
      });
  }, [convSel]);

  const conveniosFiltrados = useMemo(() => {
    const q = convQuery.trim().toLowerCase();
    return q ? convenios.filter((c) => c.nome.toLowerCase().includes(q)) : convenios;
  }, [convenios, convQuery]);

  const planosFiltrados = useMemo(() => {
    const q = planoQuery.trim().toLowerCase();
    if (!q) return planos;
    return planos.filter(
      (p) =>
        p.codigo_item.toLowerCase().includes(q) || p.descricao.toLowerCase().includes(q),
    );
  }, [planos, planoQuery]);

  const exigePlano = planos.length > 0;

  const continuar = () => {
    const novos: string[] = [];
    if (!convSel) novos.push("convenio");
    if (exigePlano && !planoSel) novos.push("plano");
    if (!carteirinha.trim()) novos.push("carteirinha");
    setErros(novos);
    if (novos.length > 0) return;

    setTipo("convenio");
    setConvenio({
      convenio_id: convSel!.id,
      convenio_nome: convSel!.nome,
      convenio_codigo_shift: convSel!.codigo_shift,
      plano_codigo: planoSel?.codigo_item ?? null,
      plano_descricao: planoSel?.descricao ?? null,
      numero_carteirinha: carteirinha.trim(),
    });
    // Durante a fase de teste do convênio não exibimos o catálogo de exames
    // (os exames são definidos pelo pedido médico anexado no envio).
    navigate(CONVENIO_PULAR_CATALOGO ? "/enviar-pedido" : "/exames/convenio/catalogo");
  };

  const hasErr = (id: string) => erros.includes(id);

  return (
    <PageShell>
      <div className="container py-8 max-w-2xl">
        <Link
          to="/exames"
          className="inline-flex items-center gap-1 text-sm text-secondary hover:underline mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold text-secondary mb-2">
          Vamos identificar seu convênio
        </h1>
        <p className="text-muted-foreground mb-5">
          Esses dados serão usados ao longo do agendamento.
        </p>

        <div className="flex items-start gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900 mb-5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-700" />
          <p>
            <strong>ATENÇÃO!</strong> Para evitar qualquer transtorno, verifique se o seu
            Plano de Saúde cobre o(s) exame(s) que deseja realizar. Cada convênio possui um
            prazo distinto e dinâmica de aprovação diferente, o que pode levar alguns dias.
            Lembramos que o prazo de aprovação e cobertura é de total responsabilidade do
            Plano de Saúde.
          </p>
        </div>

        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div>
            <Label>Convênio *</Label>
            <Popover open={convOpen} onOpenChange={setConvOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full justify-between font-normal mt-1",
                    hasErr("convenio") && "border-red-500",
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
                  <CommandList className="max-h-[360px]">

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
              <Label>Plano {exigePlano && "*"}</Label>
              {planosCarregando ? (
                <p className="text-xs text-muted-foreground mt-1">Carregando planos...</p>
              ) : exigePlano ? (
                <Popover open={planoOpen} onOpenChange={setPlanoOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between font-normal mt-1",
                        hasErr("plano") && "border-red-500",
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
                        placeholder="Buscar plano..."
                        value={planoQuery}
                        onValueChange={setPlanoQuery}
                      />
                      <CommandList className="max-h-[360px]">
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
            <Label>Número da carteirinha *</Label>
            <Input
              value={carteirinha}
              onChange={(e) => setCarteirinha(e.target.value)}
              className={cn("mt-1", hasErr("carteirinha") && "border-red-500")}
              placeholder="Conforme impresso na carteirinha"
            />
          </div>
        </div>

        <Button
          onClick={continuar}
          className="w-full mt-5 bg-brand hover:bg-brand-hover text-white"
        >
          {CONVENIO_PULAR_CATALOGO ? "Continuar" : "Continuar para catálogo"}
        </Button>
      </div>
    </PageShell>
  );
};

export default EscolherConvenio;
