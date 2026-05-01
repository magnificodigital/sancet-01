import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { usePaciente } from "@/hooks/usePaciente";
import { useSacola } from "@/stores/sacola";
import { supabase } from "@/integrations/supabase/client";
import { EtapaTipoAtendimento } from "@/components/envio/EtapaTipoAtendimento";
import { EtapaUnidade } from "@/components/envio/EtapaUnidade";
import { EtapaEndereco, EnderecoColeta } from "@/components/envio/EtapaEndereco";
import { EtapaConfirmacao } from "@/components/envio/EtapaConfirmacao";
import { Unidade } from "@/components/envio/ListaUnidades";

const IMG = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600";

const EnviarPedido = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tipo = (params.get("tipo") === "convenio" ? "convenio" : "particular") as
    | "convenio"
    | "particular";

  const { paciente, logado } = usePaciente();
  const { itens, total, limpar } = useSacola();

  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [modalidade, setModalidade] = useState<"domicilio" | "unidade" | null>(null);
  const [unidade, setUnidade] = useState<Unidade | null>(null);
  const [endereco, setEndereco] = useState<EnderecoColeta | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!logado) {
      navigate(`/entrar?redirect=${encodeURIComponent("/enviar-pedido?tipo=" + tipo)}`);
    }
  }, [logado, navigate, tipo]);

  const handleEscolherModalidade = (m: "domicilio" | "unidade") => {
    setModalidade(m);
    setEtapa(2);
  };

  const handleConfirmarPedido = async (extras: {
    numeroCarteirinha: string;
    convenioNome: string;
    arquivoCarteirinha: File | null;
  }) => {
    if (!paciente) return;
    setEnviando(true);
    try {
      let urlCarteirinha: string | null = null;

      if (extras.arquivoCarteirinha) {
        const ext = extras.arquivoCarteirinha.name.split(".").pop();
        const path = `${paciente.cpf}/${Date.now()}-carteirinha.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("documentos-pedidos")
          .upload(path, extras.arquivoCarteirinha);
        if (upErr) throw upErr;
        urlCarteirinha = path;
      }

      const payload = {
        paciente_id: paciente.id,
        paciente_cpf: paciente.cpf,
        paciente_nome: paciente.nome,
        tipo_solicitacao: tipo,
        modalidade_coleta: modalidade ?? "unidade",
        unidade_codigo_shift: unidade?.codigo_shift ?? null,
        unidade_nome: unidade?.nome ?? null,
        endereco_coleta: modalidade === "domicilio" ? (endereco as any) : null,
        itens: itens as any,
        convenio_nome: tipo === "convenio" ? extras.convenioNome : null,
        numero_carteirinha: tipo === "convenio" ? extras.numeroCarteirinha : null,
        url_carteirinha: urlCarteirinha,
        valor_total_centavos: total(),
        termos_aceitos: true,
        termos_aceitos_em: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("pedidos")
        .insert(payload)
        .select("protocolo")
        .single();
      if (error) throw error;

      localStorage.setItem("sancet-ultimo-protocolo", data.protocolo);
      limpar();
      if (tipo === "particular") {
        navigate(`/pagamento/${data.protocolo}`);
      } else {
        navigate(`/pronto/${data.protocolo}`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível enviar o pedido.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link
          to="/sacola"
          className="inline-flex items-center gap-1 text-sm text-secondary hover:underline mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <div className="mx-auto max-w-2xl">
          <div>
            {etapa === 1 && (
              <EtapaTipoAtendimento onEscolher={handleEscolherModalidade} />
            )}
            {etapa === 2 && modalidade === "unidade" && (
              <EtapaUnidade
                onConfirmar={(u) => {
                  setUnidade(u);
                  setEtapa(3);
                }}
              />
            )}
            {etapa === 2 && modalidade === "domicilio" && (
              <EtapaEndereco
                onConfirmar={(e) => {
                  setEndereco(e);
                  setEtapa(3);
                }}
              />
            )}
            {etapa === 3 && modalidade && (
              <EtapaConfirmacao
                tipo={tipo}
                modalidade={modalidade}
                unidade={unidade}
                endereco={endereco}
                enviando={enviando}
                onConfirmar={handleConfirmarPedido}
              />
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default EnviarPedido;
