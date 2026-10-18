import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type Plano = { codigo_item: string; descricao: string };

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const MAX_ITENS = 150;

/**
 * Seletor de plano com busca. Alguns convênios têm centenas de planos
 * (SulAmérica Empresa ~940), então busca por várias palavras, sem acento,
 * e ordena de forma natural ("2/..." antes de "10/...").
 */
export const SeletorPlano = ({
  planos,
  valor,
  onChange,
  erro = false,
  className,
}: {
  planos: Plano[];
  valor: Plano | null;
  onChange: (p: Plano) => void;
  erro?: boolean;
  className?: string;
}) => {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");

  const ordenados = useMemo(
    () => [...planos].sort((a, b) => a.descricao.localeCompare(b.descricao, "pt-BR", { numeric: true, sensitivity: "base" })),
    [planos],
  );
  const filtrados = useMemo(() => {
    const termos = norm(busca).split(/\s+/).filter(Boolean);
    if (!termos.length) return ordenados;
    return ordenados.filter((p) => {
      const alvo = norm(`${p.descricao} ${p.codigo_item}`);
      return termos.every((t) => alvo.includes(t));
    });
  }, [ordenados, busca]);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          className={cn("h-auto min-h-10 w-full justify-between whitespace-normal py-2 text-left font-normal", erro && "border-red-500", className)}
        >
          <span className={cn(!valor && "text-muted-foreground")}>{valor ? valor.descricao : "Busque e selecione o plano"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="pointer-events-auto w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Digite o nome do plano (ex.: especial apartamento)" value={busca} onValueChange={setBusca} />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>Nenhum plano encontrado. Confira o nome na sua carteirinha.</CommandEmpty>
            <CommandGroup
              heading={
                filtrados.length > MAX_ITENS
                  ? `${filtrados.length} planos — digite para filtrar`
                  : `${filtrados.length} plano${filtrados.length === 1 ? "" : "s"}`
              }
            >
              {filtrados.slice(0, MAX_ITENS).map((p) => (
                <CommandItem
                  key={p.codigo_item}
                  value={p.codigo_item}
                  onSelect={() => {
                    onChange(p);
                    setAberto(false);
                    setBusca("");
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4 shrink-0", valor?.codigo_item === p.codigo_item ? "opacity-100" : "opacity-0")} />
                  <span>{p.descricao}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
