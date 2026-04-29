import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BarraBusca } from "@/components/catalogo/BarraBusca";
import { FiltrosSidebar } from "@/components/catalogo/FiltrosSidebar";
import { ListaExames } from "@/components/catalogo/ListaExames";
import { ChipsPerfil } from "@/components/catalogo/ChipsPerfil";
import { CATEGORIAS_VACINAS } from "@/components/catalogo/types";

const Vacinas = () => {
  const [busca, setBusca] = useState("");
  const [emCasa, setEmCasa] = useState(false);
  const [perfil, setPerfil] = useState<string | null>(null);
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>([]);
  const [drawerAberto, setDrawerAberto] = useState(false);

  const toggleCategoria = (c: string) => {
    setCategoriasSelecionadas((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const limpar = () => {
    setEmCasa(false);
    setCategoriasSelecionadas([]);
    setPerfil(null);
  };

  // Perfil sobrepõe categorias quando selecionado
  const categoriasEfetivas = perfil ? [perfil] : categoriasSelecionadas;
  const filtrosAtivos = (emCasa ? 1 : 0) + categoriasSelecionadas.length + (perfil ? 1 : 0);

  return (
    <PageShell>
      <section className="container py-8 md:py-12">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-secondary mb-2">
            Vacinas
          </h1>
          <p className="text-muted-foreground">
            Busque por perfil ou condição clínica.
          </p>
        </div>

        <div className="mb-5 flex gap-2 items-center">
          <div className="flex-1">
            <BarraBusca busca={busca} setBusca={setBusca} placeholder="Buscar vacina" />
          </div>
          <Sheet open={drawerAberto} onOpenChange={setDrawerAberto}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="h-12 rounded-full md:hidden gap-2 relative"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
                {filtrosAtivos > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-primary text-primary-foreground">
                    {filtrosAtivos}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-4">
              <FiltrosSidebar
                mobile
                emCasa={emCasa}
                setEmCasa={setEmCasa}
                categorias={CATEGORIAS_VACINAS}
                categoriasSelecionadas={categoriasSelecionadas}
                toggleCategoria={toggleCategoria}
                limpar={limpar}
                onAplicar={() => setDrawerAberto(false)}
              />
            </SheetContent>
          </Sheet>
        </div>

        <div className="mb-6">
          <ChipsPerfil selecionado={perfil} onSelect={setPerfil} />
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-6">
          <aside className="hidden md:block">
            <div className="sticky top-24">
              <FiltrosSidebar
                emCasa={emCasa}
                setEmCasa={setEmCasa}
                categorias={CATEGORIAS_VACINAS}
                categoriasSelecionadas={categoriasSelecionadas}
                toggleCategoria={toggleCategoria}
                limpar={limpar}
              />
            </div>
          </aside>

          <div>
            <ListaExames
              tipo="vacina"
              busca={busca}
              emCasa={emCasa}
              categoriasSelecionadas={categoriasEfetivas}
            />
          </div>
        </div>
      </section>
    </PageShell>
  );
};

export default Vacinas;
