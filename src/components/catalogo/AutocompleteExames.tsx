import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Sugestao = {
  codigo_shift: string;
  nome: string;
  outros_nomes: string[] | null;
  categoria: string | null;
};

export const AutocompleteExames = ({
  placeholder = "Digite o exame (ex: Hemograma)",
}: {
  placeholder?: string;
}) => {
  const navigate = useNavigate();
  const [valor, setValor] = useState("");
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [destacado, setDestacado] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Debounce + busca no Supabase
  useEffect(() => {
    const termo = valor.trim();
    if (termo.length < 2) {
      setSugestoes([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const t = setTimeout(async () => {
      const escape = termo.replace(/[%_]/g, "\\$&");
      const { data, error } = await supabase
        .from("exames_cache")
        .select("codigo_shift, nome, outros_nomes, categoria")
        .eq("ativo", true)
        .or(`nome.ilike.%${escape}%,outros_nomes.cs.{${escape}}`)
        .order("nome")
        .limit(8);
      if (!error) {
        setSugestoes((data ?? []) as Sugestao[]);
        setDestacado(0);
        setAberto(true);
      }
      setCarregando(false);
    }, 250);
    return () => clearTimeout(t);
  }, [valor]);

  const irParaBusca = (termo: string) => {
    const q = termo.trim();
    navigate(q ? `/exames?q=${encodeURIComponent(q)}` : "/exames");
    setAberto(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!aberto || sugestoes.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        irParaBusca(valor);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDestacado((d) => (d + 1) % sugestoes.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDestacado((d) => (d - 1 + sugestoes.length) % sugestoes.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const s = sugestoes[destacado];
      irParaBusca(s ? s.nome : valor);
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          irParaBusca(valor);
        }}
        className="relative"
      >
        <Search className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onFocus={() => sugestoes.length > 0 && setAberto(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={aberto}
          className="pl-12 pr-28 h-14 rounded-pill bg-white text-foreground placeholder:text-muted-foreground border-0 shadow-lg focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        {carregando && (
          <Loader2 className="h-4 w-4 absolute right-32 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
        )}
        <Button
          type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 rounded-pill bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold px-5"
        >
          <Search className="h-4 w-4" />
          Buscar
        </Button>
      </form>

      {aberto && sugestoes.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-2 bg-card text-card-foreground rounded-2xl border shadow-xl overflow-hidden max-h-80 overflow-y-auto"
        >
          {sugestoes.map((s, i) => (
            <li
              key={s.codigo_shift}
              role="option"
              aria-selected={i === destacado}
              onMouseEnter={() => setDestacado(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                irParaBusca(s.nome);
              }}
              className={cn(
                "px-4 py-3 cursor-pointer flex flex-col gap-0.5 border-b last:border-b-0",
                i === destacado ? "bg-muted" : "hover:bg-muted/60"
              )}
            >
              <span className="font-semibold text-sm">{s.nome}</span>
              {s.outros_nomes && s.outros_nomes.length > 0 && (
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {s.outros_nomes.join(", ")}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
