import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Mail, MessageSquareText, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { calcularJejumPedido, JejumPedido } from "@/lib/preparo";
import { rotuloPeriodo } from "./utils";

type Props = {
  aberto: boolean;
  pedidoId: string;
  emailPaciente: string | null | undefined;
  confirmando: boolean;
  onVoltar: () => void;
  onConfirmar: () => void;
};

type Alerta = { nivel: "erro" | "aviso"; texto: string };

const dataBR = (iso: string | null | undefined) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
};

/**
 * Resumo do que vai para o paciente ANTES de confirmar o pedido (a confirmação
 * dispara os e-mails de confirmação e de preparo). Lê o pedido atualizado do
 * banco — reflete edições de exames/recado feitas agora há pouco.
 */
export const RevisaoConfirmacao = ({
  aberto,
  pedidoId,
  emailPaciente,
  confirmando,
  onVoltar,
  onConfirmar,
}: Props) => {
  const [p, setP] = useState<any>(null);
  const [jejum, setJejum] = useState<JejumPedido | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    let ativo = true;
    setCarregando(true);
    setP(null);
    setJejum(null);
    (async () => {
      const { data } = await supabase.from("pedidos").select("*").eq("id", pedidoId).maybeSingle();
      if (!ativo) return;
      setP(data);
      const itens = Array.isArray((data as any)?.itens) ? (data as any).itens : [];
      const j = await calcularJejumPedido(itens).catch(() => null);
      if (!ativo) return;
      setJejum(j);
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, [aberto, pedidoId]);

  const itens: any[] = Array.isArray(p?.itens) ? p.itens : [];
  const ehConvenio = p?.tipo_solicitacao === "convenio";
  const recado = String(p?.info_paciente ?? "").trim();

  const alertas: Alerta[] = [];
  if (p) {
    if (!emailPaciente) alertas.push({ nivel: "erro", texto: "Paciente sem e-mail: ele NÃO vai receber a confirmação nem o preparo." });
    if (itens.length === 0) alertas.push({ nivel: "erro", texto: "O pedido está sem exames." });
    if (ehConvenio && !(Array.isArray(p.convenio_tokens) && p.convenio_tokens.length > 0)) {
      alertas.push({
        nivel: "aviso",
        texto: p.convenio_token_solicitado_em
          ? "Token do convênio solicitado, mas o paciente ainda não informou."
          : "Token do convênio não informado (e ainda não foi solicitado).",
      });
    }
    const lidosIA = (Array.isArray(p.exames_identificados_ia) ? p.exames_identificados_ia : []) as any[];
    const fora = [...new Map(lidosIA.map((e) => [String(e?.codigo_shift), e])).values()].filter(
      (e) => e?.codigo_shift && !itens.some((i) => String(i.codigoShift) === String(e.codigo_shift)),
    );
    if (fora.length) {
      alertas.push({
        nivel: "aviso",
        texto: `A IA leu ${fora.length} exame(s) no pedido médico que não estão no pedido: ${fora.map((e) => e.nome).join(", ")}.`,
      });
    }
    if (!p.url_pedido_medico) alertas.push({ nivel: "aviso", texto: "Pedido médico não anexado." });
    if (ehConvenio && !p.url_carteirinha) alertas.push({ nivel: "aviso", texto: "Carteirinha do convênio não anexada." });
    if (!p.url_rg_frente || !p.url_rg_verso) alertas.push({ nivel: "aviso", texto: "Documento de identidade incompleto (frente/verso)." });
    if (p.modalidade_coleta !== "domicilio" && p.data_agendamento) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      if (new Date(`${p.data_agendamento}T00:00:00`) < hoje) {
        alertas.push({ nivel: "aviso", texto: "A data agendada já passou — combine uma nova data com o paciente." });
      }
    }
    if (jejum?.semPreparo.length) {
      alertas.push({
        nivel: "aviso",
        texto: `Sem preparo cadastrado (vai como "confirme na recepção"): ${jejum.semPreparo.join(", ")}.`,
      });
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && !confirmando && onVoltar()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-secondary">Revisar antes de confirmar</DialogTitle>
          <DialogDescription>
            Ao confirmar, o paciente recebe por e-mail a <b>confirmação</b> e o <b>preparo dos exames</b>.
          </DialogDescription>
        </DialogHeader>

        {carregando || !p ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando o resumo…
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            {alertas.length > 0 ? (
              <ul className="space-y-1.5">
                {alertas.map((a, i) => (
                  <li
                    key={i}
                    className={
                      "flex items-start gap-2 rounded-md px-3 py-2 " +
                      (a.nivel === "erro" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900")
                    }
                  >
                    {a.nivel === "erro" ? (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <span>{a.texto}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-green-800">
                <CheckCircle2 className="h-4 w-4" /> Nenhuma pendência encontrada.
              </p>
            )}

            <div className="space-y-1 rounded-lg border p-3">
              <p className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Vai para:</span>{" "}
                <b>{emailPaciente || "— sem e-mail —"}</b>
              </p>
              <p><span className="text-muted-foreground">Paciente:</span> {p.paciente_nome ?? "—"}</p>
              {p.modalidade_coleta === "domicilio" ? (
                <p><span className="text-muted-foreground">Coleta:</span> em casa</p>
              ) : (
                <>
                  <p><span className="text-muted-foreground">Unidade:</span> {p.unidade_nome ?? "—"}</p>
                  <p>
                    <span className="text-muted-foreground">Agendamento:</span>{" "}
                    {dataBR(p.data_agendamento)} — {rotuloPeriodo(p.periodo_agendamento)}
                  </p>
                </>
              )}
              {ehConvenio && (
                <p><span className="text-muted-foreground">Convênio:</span> {p.convenio_nome ?? "—"}</p>
              )}
            </div>

            <div
              className={
                "rounded-lg border-2 p-3 " +
                (jejum && jejum.horas > 0 ? "border-orange-400 bg-orange-50" : "border-green-400 bg-green-50")
              }
            >
              {jejum && jejum.horas > 0 ? (
                <>
                  <p className="font-bold text-orange-800">Jejum: {jejum.horas} horas</p>
                  <p className="text-xs text-orange-900/80">Exigido por: {jejum.exigidoPor.join(", ")}.</p>
                </>
              ) : (
                <p className="font-bold text-green-800">Não é necessário jejum</p>
              )}
            </div>

            <div className="rounded-lg border">
              <p className="border-b px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
                Exames ({itens.length})
              </p>
              <ul className="max-h-48 divide-y overflow-y-auto">
                {itens.map((it, i) => (
                  <li key={i} className="px-3 py-1.5">{it.nome ?? it.codigoShift}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-sky-800">
                <MessageSquareText className="h-3.5 w-3.5" /> Informação para o paciente
              </p>
              {recado ? (
                <p className="whitespace-pre-line text-sky-950">{recado}</p>
              ) : (
                <p className="text-muted-foreground">Nenhuma — o e-mail sai sem recado.</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onVoltar} disabled={confirmando}>
            Voltar e ajustar
          </Button>
          <Button
            onClick={onConfirmar}
            disabled={confirmando || carregando || !p}
            className="bg-brand text-white hover:bg-brand-hover"
          >
            {confirmando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar e enviar ao paciente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
