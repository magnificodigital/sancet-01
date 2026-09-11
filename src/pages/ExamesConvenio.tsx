import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageShell } from "@/components/layout/PageShell";
import { BarraBusca } from "@/components/catalogo/BarraBusca";
import { ListaExames } from "@/components/catalogo/ListaExames";
import { HeaderContexto } from "@/components/catalogo/HeaderContexto";
import { useSacola } from "@/stores/sacola";

const ExamesConvenio = () => {
  const navigate = useNavigate();
  const { convenio_id, convenio_nome } = useSacola();
  const [searchParams] = useSearchParams();
  const qInicial = searchParams.get("q") ?? "";
  const [busca, setBusca] = useState(qInicial);

  useEffect(() => {
    if (!convenio_id) {
      navigate("/exames/convenio/escolher-convenio", { replace: true });
    }
  }, [convenio_id, navigate]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) setBusca(q);
  }, [searchParams]);

  return (
    <PageShell>
      <section className="container py-6 md:py-8">
        <HeaderContexto />

        <nav className="text-xs text-muted-foreground mb-3">
          Exames <span className="px-1">›</span> Convênio{" "}
          <span className="px-1">›</span>
          <span className="text-secondary">{convenio_nome ?? "—"}</span>{" "}
          <span className="px-1">›</span>
          <span className="text-secondary font-medium">Catálogo</span>
        </nav>

        <div className="mb-5">
          <h1 className="text-2xl md:text-3xl font-bold text-secondary mb-1">
            Exames — Convênio
          </h1>
          <p className="text-sm text-muted-foreground">
            Busque e selecione os exames. A cobertura é confirmada pela nossa
            equipe após o envio, conforme o seu plano.
          </p>
        </div>

        <div className="mb-6 max-w-2xl">
          <BarraBusca busca={busca} setBusca={setBusca} placeholder="Buscar exame pelo nome" />
        </div>

        <ListaExames
          tipo="exame"
          origem="convenio"
          busca={busca}
          emCasa={false}
          categoriasSelecionadas={[]}
          mostrarPreco={false}
        />
      </section>
    </PageShell>
  );
};

export default ExamesConvenio;
