import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { usePaciente } from "@/hooks/usePaciente";
import { useSacola } from "@/stores/sacola";
import { supabase } from "@/integrations/supabase/client";
import { EtapaTipoAtendimento } from "@/components/envio/EtapaTipoAtendimento";
import { EtapaUnidade } from "@/components/envio/EtapaUnidade";
import { EtapaEndereco, EnderecoColeta } from "@/components/envio/EtapaEndereco";
import { EtapaAgendamento, Agendamento } from "@/components/envio/EtapaAgendamento";
import { EtapaConfirmacao } from "@/components/envio/EtapaConfirmacao";
import { Unidade } from "@/components/envio/ListaUnidades";
import { dateToISO } from "@/lib/agendamento";
import { HeaderContexto } from "@/components/catalogo/HeaderContexto";

const EnviarPedido = () => {
  const navigate = useNavigate();
  const { paciente, logado } = usePaciente();
  const {
    itens,
    total,
    limpar,
    tipo,
    convenio_id,
    convenio_nome,
    convenio_codigo_shift,
    plano_codigo,
    plano_descricao,
    numero_carteirinha,
    limparContexto,
  } = useSacola();

  const tipoEfetivo: "particular" | "convenio" = tipo ?? "particular";

  const [etapa, setEtapa] = useState<1 | 2 | 3 | 4>(1);
  const [modalidade, setModalidade] = useState<"domicilio" | "unidade" | null>(null);
  const [unidade, setUnidade] = useState<Unidade | null>(null);
  const [endereco, setEndereco] = useState<EnderecoColeta | null>(null);
  const [agendamento, setAgendamento] = useState<Agendamento | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Guards
  useEffect(() => {
    if (!tipo) {
      navigate("/exames", { replace: true });
      return;
    }
    if (!logado) {
      navigate(`/entrar?redirect=${encodeURIComponent("/enviar-pedido")}`);
    }
  }, [tipo, logado, navigate]);

  const handleEscolherModalidade = (m: "domicilio" | "unidade") => {
    setModalidade(m);
    setEtapa(2);
  };

  const handleConfirmarPedido = async (extras: {
    numeroCarteirinha: string;
    convenioId: string | null;
    convenioNome: string;
    convenioCodigoShift: string | null;
    planoCodigo: string | null;
    planoDescricao: string | null;
    arquivoCarteirinha: File | null;
    arquivoPedidoMedico: File | null;
    arquivoRgFrente: File | null;
    arquivoRgVerso: File | null;
    arquivoCertidao: File | null;
    arquivoRelatorioMedico: File | null;
    tipoDocumentoIdentidade: "rg" | "certidao";
    deficiencias: string;
  }) => {
    if (!paciente) return;
    setEnviando(true);
    try {
      const uploadDoc = async (file: File | null, sufixo: string) => {
        if (!file) return null;
        const ext = file.name.split(".").pop();
        const path = `${paciente.cpf}/${Date.now()}-${sufixo}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("documentos-pedidos")
          .upload(path, file);
        if (upErr) throw upErr;
        return path;
      };

      const [
        urlCarteirinha,
        urlPedidoMedico,
        urlRgFrente,
        urlRgVerso,
        urlCertidao,
        urlRelatorioMedico,
      ] = await Promise.all([
        uploadDoc(extras.arquivoCarteirinha, "carteirinha"),
        uploadDoc(extras.arquivoPedidoMedico, "pedido-medico"),
        uploadDoc(extras.arquivoRgFrente, "rg-frente"),
        uploadDoc(extras.arquivoRgVerso, "rg-verso"),
        uploadDoc(extras.arquivoCertidao, "certidao"),
        uploadDoc(extras.arquivoRelatorioMedico, "relatorio-medico"),
      ]);

      const ehConvenio = tipoEfetivo === "convenio";

      const payload: any = {
        paciente_nome: paciente.nome,
        tipo_solicitacao: tipoEfetivo,
        modalidade_coleta: modalidade ?? "unidade",
        unidade_codigo_shift: unidade?.codigo_shift ?? null,
        unidade_nome: unidade?.nome ?? null,
        endereco_coleta: modalidade === "domicilio" ? endereco : null,
        itens,
        convenio_codigo_shift: ehConvenio ? extras.convenioCodigoShift : null,
        convenio_nome: ehConvenio ? extras.convenioNome : null,
        plano_codigo: ehConvenio ? extras.planoCodigo : null,
        plano_descricao: ehConvenio ? extras.planoDescricao : null,
        numero_carteirinha: ehConvenio ? extras.numeroCarteirinha : null,
        url_carteirinha: urlCarteirinha,
        url_pedido_medico: urlPedidoMedico,
        url_rg_frente: urlRgFrente,
        url_rg_verso: urlRgVerso,
        url_certidao_nascimento: urlCertidao,
        url_relatorio_medico: urlRelatorioMedico,
        tipo_documento_identidade: extras.tipoDocumentoIdentidade,
        valor_total_centavos: ehConvenio ? 0 : total(),
        deficiencias: extras.deficiencias || null,
        termos_aceitos: true,
      };

      if (modalidade === "unidade" && agendamento) {
        payload.data_agendamento = dateToISO(agendamento.data);
        payload.periodo_agendamento = agendamento.periodo;
      }

      const { data, error } = await supabase.rpc("criar_pedido_paciente", {
        p_cpf: paciente.cpf,
        p_data_nasc: paciente.data_nascimento,
        p_pedido: payload,
      });
      if (error) throw error;
      const protocolo = (data as any)?.protocolo as string;
      const pedidoId = (data as any)?.id as string | undefined;
      if (!protocolo) throw new Error("Resposta inválida ao criar pedido.");

      if (pedidoId) {
        supabase.functions
          .invoke("enviar-email-pedido", {
            body: { pedido_id: pedidoId, tipo: "novo" },
          })
          .catch(() => {});
      }

      localStorage.setItem("sancet-ultimo-protocolo", protocolo);
      limpar();
      limparContexto();
      if (tipoEfetivo === "particular") {
        navigate(`/pagamento/${protocolo}`);
      } else {
        navigate(`/pronto/${protocolo}`);
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
        <HeaderContexto />
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
                  setEtapa(4);
                }}
              />
            )}
            {etapa === 3 && modalidade === "unidade" && (
              <EtapaAgendamento
                onConfirmar={(a) => {
                  setAgendamento(a);
                  setEtapa(4);
                }}
              />
            )}
            {etapa === 4 && modalidade && (
              <EtapaConfirmacao
                tipo={tipoEfetivo}
                modalidade={modalidade}
                unidade={unidade}
                endereco={endereco}
                agendamento={agendamento}
                enviando={enviando}
                onConfirmar={handleConfirmarPedido}
                convenioPreset={
                  tipoEfetivo === "convenio" && convenio_id
                    ? {
                        id: convenio_id,
                        nome: convenio_nome ?? "",
                        codigo_shift: convenio_codigo_shift ?? "",
                        planoCodigo: plano_codigo,
                        planoDescricao: plano_descricao,
                        numeroCarteirinha: numero_carteirinha ?? "",
                      }
                    : null
                }
              />
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default EnviarPedido;
