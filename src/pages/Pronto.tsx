import { useParams } from "react-router-dom";
import { PageShell } from "@/components/layout/PageShell";
import { EmConstrucao } from "@/components/EmConstrucao";

const Pronto = () => {
  const { protocolo } = useParams();
  return (
    <PageShell>
      <EmConstrucao
        titulo="Pedido recebido!"
        descricao={`Em construção. Protocolo: ${protocolo ?? "—"}`}
      />
    </PageShell>
  );
};

export default Pronto;
