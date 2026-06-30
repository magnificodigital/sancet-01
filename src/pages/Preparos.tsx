import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2, Search, ClipboardList, ArrowUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type ItemPreparo = {
  codigo_shift: string;
  nome: string;
  preparo: string;
  categoria: string | null;
};

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const Preparos = () => {
  const [itens, setItens] = useState<ItemPreparo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data } = await supabase
        .from("exames_cache")
        .select("codigo_shift, nome, preparo, categoria")
        .eq("ativo", true)
        .not("preparo", "is", null);
      if (!ativo) return;
      const filtrados = ((data as any[]) ?? [])
        .filter((e) => (e.preparo ?? "").trim().length > 0)
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
      setItens(filtrados);
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const filtrados = useMemo(() => {
    const q = normalizar(busca.trim());
    if (!q) return itens;
    return itens.filter(
      (e) =>
        normalizar(e.nome).includes(q) ||
        normalizar(e.preparo).includes(q) ||
        normalizar(e.categoria ?? "").includes(q),
    );
  }, [busca, itens]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Como se preparar para exames | Sancet</title>
        <meta
          name="description"
          content="Instruções de preparo para exames laboratoriais e de imagem oferecidos pela Sancet."
        />
        <link rel="canonical" href="/preparos" />
      </Helmet>

      <Header />

      <main className="flex-1">
        <section className="bg-gradient-to-b from-secondary to-secondary/90 text-white pt-28 pb-12">
          <div className="container">
            <div className="flex items-center gap-3 mb-3">
              <ClipboardList className="h-6 w-6" />
              <span className="text-sm font-semibold uppercase tracking-wider opacity-90">
                Orientações ao paciente
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Como se preparar para o seu exame
            </h1>
            <p className="text-white/85 max-w-2xl">
              Confira abaixo as instruções de preparo. Em caso de dúvida, fale com
              nossa equipe antes de comparecer à unidade.
            </p>

            <div className="relative mt-6 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por exame..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 bg-white text-foreground"
              />
            </div>
          </div>
        </section>

        <section className="container py-10">
          {carregando ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              {busca
                ? "Nenhum exame encontrado para esta busca."
                : "Nenhuma instrução de preparo cadastrada ainda."}
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {filtrados.length} exame{filtrados.length === 1 ? "" : "s"} com
                instruções de preparo
              </p>
              <Accordion type="multiple" className="space-y-2">
                {filtrados.map((e) => (
                  <AccordionItem
                    key={e.codigo_shift}
                    value={e.codigo_shift}
                    id={`exame-${e.codigo_shift}`}
                    className="border rounded-lg bg-white px-4 scroll-mt-24"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="text-left">
                        <div className="font-semibold">{e.nome}</div>
                        {e.categoria && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {e.categoria}
                          </div>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="text-sm text-muted-foreground whitespace-pre-line pt-1">
                        {e.preparo}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="gap-2"
                >
                  <ArrowUp className="h-4 w-4" /> Voltar ao topo
                </Button>
              </div>
            </>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Preparos;
