import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { BarraBusca } from "@/components/catalogo/BarraBusca";
import { FiltrosSidebar } from "@/components/catalogo/FiltrosSidebar";
import { ListaExames } from "@/components/catalogo/ListaExames";
import { CATEGORIAS_EXAMES } from "@/components/catalogo/types";
import { HeaderContexto } from "@/components/catalogo/HeaderContexto";
import { useSacola } from "@/stores/sacola";

const ExamesParticular = () => {
  const navigate = useNavigate();
  const { tipo, setTipo } = useSacola();
  const [searchParams] = useSearchParams();
  const qInicial = searchParams.get("q") ?? "";
  const [busca, setBusca] = useState(qInicial);
  const [emCasa, setEmCasa] = useState(false);
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>([]);
  const [drawerAberto, setDrawerAberto] = useState(false);

  useEffect(() => {
    if (tipo === null) {
      setTipo("particular");
    } else if (tipo === "convenio") {
      navigate("/exames", { replace: true });
    }
  }, [tipo, setTipo, navigate]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) setBusca(q);
  }, [searchParams]);

  const toggleCategoria = (c: string) =>
    setCategoriasSelecionadas((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  const limpar = () => {
    setEmCasa(false);
    setCategoriasSelecionadas([]);
  };
  const filtrosAtivos = (emCasa ? 1 : 0) + categoriasSelecionadas.length;

  return (
    <PageShell>
      <section className="container py-6 md:py-8">
        <HeaderContexto />

        <nav className="text-xs text-muted-foreground mb-3">
          Exames <span className="px-1">›</span> Particular{" "}
          <span className="px-1">›</span>
          <span className="text-secondary font-medium">Catálogo</span>
        </nav>

        <div className="mb-5">
          <h1 className="text-2xl md:text-3xl font-bold text-secondary mb-1">
            Exames — Particular
          </h1>
          <p className="text-sm text-muted-foreground">
            Busque pelo nome como está no pedido médico.
          </p>
        </div>

        <div className="mb-6 flex gap-2 items-center">
          <div className="flex-1">
            <BarraBusca busca={busca} setBusca={setBusca} placeholder="Buscar exame" />
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
                categorias={CATEGORIAS_EXAMES}
                categoriasSelecionadas={categoriasSelecionadas}
                toggleCategoria={toggleCategoria}
                limpar={limpar}
                onAplicar={() => setDrawerAberto(false)}
              />
            </SheetContent>
          </Sheet>
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-6">
          <aside className="hidden md:block">
            <div className="sticky top-24">
              <FiltrosSidebar
                emCasa={emCasa}
                setEmCasa={setEmCasa}
                categorias={CATEGORIAS_EXAMES}
                categoriasSelecionadas={categoriasSelecionadas}
                toggleCategoria={toggleCategoria}
                limpar={limpar}
              />
            </div>
          </aside>

          <div>
            <ListaExames
              tipo="exame"
              busca={busca}
              emCasa={emCasa}
              categoriasSelecionadas={categoriasSelecionadas}
              mostrarPreco
            />
          </div>
        </div>
      </section>
    </PageShell>
  );
};

export default ExamesParticular;
