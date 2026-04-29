import { useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useSacola, ItemSacola } from "@/stores/sacola";
import { SacolaVazia } from "@/components/sacola/SacolaVazia";
import { CardEscolhaTipo } from "@/components/sacola/CardEscolhaTipo";
import { ListaItensSacola } from "@/components/sacola/ListaItensSacola";
import { ListaNaoAdicionados } from "@/components/sacola/ListaNaoAdicionados";
import { DetalheItemDrawer } from "@/components/sacola/DetalheItemDrawer";

const Sacola = () => {
  const { itens, naoAdicionados } = useSacola();
  const [detalhe, setDetalhe] = useState<ItemSacola | null>(null);

  if (itens.length === 0 && naoAdicionados.length === 0) {
    return (
      <PageShell>
        <SacolaVazia />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold text-secondary mb-6">Sua Sacola</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <CardEscolhaTipo />
          </aside>

          <section>
            <Tabs defaultValue="adicionados">
              <TabsList>
                <TabsTrigger value="adicionados" className="gap-2">
                  Adicionados
                  <Badge variant="secondary">{itens.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="nao" className="gap-2">
                  Não adicionados
                  <Badge variant="secondary">{naoAdicionados.length}</Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="adicionados" className="mt-4">
                {itens.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">
                    Nenhum item adicionado ainda.
                  </p>
                ) : (
                  <ListaItensSacola onVerDetalhes={setDetalhe} />
                )}
              </TabsContent>

              <TabsContent value="nao" className="mt-4">
                <ListaNaoAdicionados />
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>

      <DetalheItemDrawer item={detalhe} onClose={() => setDetalhe(null)} />
    </PageShell>
  );
};

export default Sacola;
