import { useEffect, useState } from "react";
import { CalendarDays, ClipboardList, CreditCard, ExternalLink, MessageSquare, Paperclip, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BadgeStatus } from "./BadgeStatus";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const db = supabase as any;

type ConversaFicha = {
  id: string;
  paciente_id: string | null;
  paciente_sugerido_id?: string | null;
  lead_nome: string | null;
  lead_telefone: string | null;
  lead_email: string | null;
  unidade_nome: string | null;
  pedido_protocolo: string | null;
};
type Paciente = { id: string; nome: string | null; nome_social: string | null; cpf: string | null; data_nascimento: string | null; celular: string | null; email: string | null };
type PedidoResumo = {
  id: string;
  protocolo: string;
  status: string;
  tipo_solicitacao: string;
  unidade_nome: string | null;
  data_agendamento: string | null;
  periodo_agendamento: string | null;
  created_at: string;
};
type ConvAnterior = { id: string; ultima_msg_em: string | null; ultima_msg_texto: string | null; status: string; unidade_nome: string | null };

const cpfMascarado = (cpf: string | null) => {
  const d = (cpf ?? "").replace(/\D/g, "");
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : null;
};
const idade = (nasc: string | null) => {
  if (!nasc) return null;
  const n = new Date(nasc);
  if (isNaN(n.getTime())) return null;
  const h = new Date();
  let a = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) a--;
  return a;
};
const dataBR = (iso: string | null) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "");
const fone = (t: string | null) => {
  const d = (t ?? "").replace(/\D/g, "");
  return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : t;
};

const Secao = ({ titulo, icone: Icone, children }: { titulo: string; icone: typeof UserRound; children: React.ReactNode }) => (
  <div className="space-y-2 border-b p-3">
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      <Icone className="h-3.5 w-3.5" /> {titulo}
    </p>
    {children}
  </div>
);

/** Painel lateral da conversa: quem é o paciente, pedidos, convênio e conversas anteriores. */
export const FichaPacienteChat = ({
  conversa,
  anexosNaConversa,
  onAbrirPedido,
  onAbrirConversa,
  podeVincular = false,
  onVinculado,
}: {
  conversa: ConversaFicha;
  podeVincular?: boolean;
  onVinculado?: () => void;
  anexosNaConversa: number;
  onAbrirPedido: (pedidoId: string) => void;
  onAbrirConversa: (id: string) => void;
}) => {
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [possivel, setPossivel] = useState(false);
  const [pedidos, setPedidos] = useState<PedidoResumo[]>([]);
  const [convenios, setConvenios] = useState<any[]>([]);
  const [anteriores, setAnteriores] = useState<ConvAnterior[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    (async () => {
      setCarregando(true);
      setPaciente(null);
      setPossivel(false);
      setPedidos([]);
      setConvenios([]);
      const cols = "id, nome, nome_social, cpf, data_nascimento, celular, email";
      let p: Paciente | null = null;
      let ehPossivel = false;
      if (conversa.paciente_id) {
        const { data } = await db.from("pacientes").select(cols).eq("id", conversa.paciente_id).maybeSingle();
        p = data ?? null;
      } else if (conversa.paciente_sugerido_id) {
        const { data } = await db.from("pacientes").select(cols).eq("id", conversa.paciente_sugerido_id).maybeSingle();
        p = data ?? null;
        ehPossivel = !!p;
      } else {
        // Visitante: tenta achar o cadastro pelo celular informado na qualificação.
        const tel = (conversa.lead_telefone ?? "").replace(/\D/g, "");
        if (tel.length >= 10) {
          const { data } = await db.from("pacientes").select(cols).ilike("celular", `%${tel.slice(-8)}`).limit(5);
          const achados = (data ?? []).filter((x: Paciente) => (x.celular ?? "").replace(/\D/g, "").endsWith(tel.slice(-8)));
          if (achados.length === 1) {
            p = achados[0];
            ehPossivel = true;
          }
        }
      }
      if (!vivo) return;
      setPaciente(p);
      setPossivel(ehPossivel);

      const tel = (conversa.lead_telefone ?? "").replace(/\D/g, "");
      const filtros = [p?.id && `paciente_id.eq.${p.id}`, tel.length >= 10 && `lead_telefone.eq.${tel}`].filter(Boolean).join(",");
      const [ped, conv, ant] = await Promise.all([
        p
          ? db
              .from("pedidos")
              .select("id, protocolo, status, tipo_solicitacao, unidade_nome, data_agendamento, periodo_agendamento, created_at")
              .eq("paciente_id", p.id)
              .order("created_at", { ascending: false })
              .limit(8)
          : Promise.resolve({ data: [] }),
        p ? db.from("paciente_convenios").select("convenio_nome, plano_descricao, numero_carteirinha, principal").eq("paciente_id", p.id) : Promise.resolve({ data: [] }),
        filtros
          ? db
              .from("chat_conversas")
              .select("id, ultima_msg_em, ultima_msg_texto, status, unidade_nome")
              .or(filtros)
              .neq("id", conversa.id)
              .not("ultima_msg_em", "is", null)
              .order("ultima_msg_em", { ascending: false })
              .limit(5)
          : Promise.resolve({ data: [] }),
      ]);
      if (!vivo) return;
      setPedidos(ped.data ?? []);
      setConvenios(conv.data ?? []);
      setAnteriores(ant.data ?? []);
      setCarregando(false);
    })();
    return () => {
      vivo = false;
    };
  }, [conversa.id, conversa.paciente_id, conversa.paciente_sugerido_id, conversa.lead_telefone]);

  const [vinculando, setVinculando] = useState(false);
  const vincular = async () => {
    if (!paciente) return;
    if (!window.confirm(`Confirmar que este visitante é ${paciente.nome_social || paciente.nome}? Confira nome e celular antes.`)) return;
    setVinculando(true);
    const { error } = await db.rpc("chat_vincular_paciente", { _conversa: conversa.id, _paciente: paciente.id });
    setVinculando(false);
    if (error) return alert(error.message);
    onVinculado?.();
  };

  const nome = paciente?.nome_social || paciente?.nome || conversa.lead_nome || "Visitante";
  const anos = idade(paciente?.data_nascimento ?? null);

  return (
    <div className="text-sm">
      <Secao titulo="Paciente" icone={UserRound}>
        <p className="font-semibold">{nome}</p>
        {possivel && (
          <div className="space-y-1.5 rounded bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
            <p>Possível cadastro encontrado pelo celular (visitante não logado). Confira antes de vincular.</p>
            {podeVincular && (
              <Button size="sm" variant="outline" className="h-7 w-full border-amber-300 bg-white text-xs" disabled={vinculando} onClick={vincular}>
                {vinculando ? "Vinculando..." : "Vincular ao cadastro"}
              </Button>
            )}
          </div>
        )}
        {!paciente && !carregando && <p className="text-xs text-muted-foreground">Sem cadastro no site (ainda).</p>}
        <div className="space-y-0.5 text-xs text-muted-foreground">
          {(paciente?.celular || conversa.lead_telefone) && <p>📱 {fone(paciente?.celular || conversa.lead_telefone)}</p>}
          {(paciente?.email || conversa.lead_email) && <p className="truncate">✉️ {paciente?.email || conversa.lead_email}</p>}
          {cpfMascarado(paciente?.cpf ?? null) && <p>CPF {cpfMascarado(paciente?.cpf ?? null)}</p>}
          {anos != null && <p>{anos} anos</p>}
          {conversa.unidade_nome && <p>📍 Unidade escolhida: {conversa.unidade_nome}</p>}
          {anexosNaConversa > 0 && (
            <p className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" /> {anexosNaConversa} anexo(s) nesta conversa
            </p>
          )}
        </div>
      </Secao>

      <Secao titulo="Pedidos" icone={ClipboardList}>
        {carregando ? (
          <p className="text-xs text-muted-foreground">Carregando...</p>
        ) : pedidos.length === 0 ? (
          <p className="text-xs text-muted-foreground">{paciente ? "Nenhum pedido visível para você." : "—"}</p>
        ) : (
          <div className="space-y-1.5">
            {pedidos.map((p) => (
              <button
                key={p.id}
                onClick={() => onAbrirPedido(p.id)}
                className={cn(
                  "w-full rounded-md border p-2 text-left hover:bg-muted/60",
                  p.protocolo === conversa.pedido_protocolo && "border-brand ring-1 ring-brand/30",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold">{p.protocolo}</span>
                  <BadgeStatus status={p.status} />
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {p.tipo_solicitacao === "convenio" ? "Convênio" : "Particular"} · {p.unidade_nome ?? "—"}
                </p>
                {p.data_agendamento && (
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CalendarDays className="h-3 w-3" /> {dataBR(p.data_agendamento)} {p.periodo_agendamento === "tarde" ? "tarde" : "manhã"}
                  </p>
                )}
                {p.protocolo === conversa.pedido_protocolo && <p className="mt-0.5 text-[10px] font-semibold text-brand">Criado nesta conversa</p>}
              </button>
            ))}
          </div>
        )}
      </Secao>

      {convenios.length > 0 && (
        <Secao titulo="Convênio salvo" icone={CreditCard}>
          {convenios.map((c, i) => (
            <div key={i} className="text-xs">
              <p className="font-medium">
                {c.convenio_nome} {c.principal && <span className="text-[10px] text-brand">(principal)</span>}
              </p>
              {c.plano_descricao && <p className="text-muted-foreground">{c.plano_descricao}</p>}
              {c.numero_carteirinha && <p className="font-mono text-muted-foreground">Carteirinha {c.numero_carteirinha}</p>}
            </div>
          ))}
        </Secao>
      )}

      <Secao titulo="Conversas anteriores" icone={MessageSquare}>
        {anteriores.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma.</p>
        ) : (
          anteriores.map((a) => (
            <Button key={a.id} variant="ghost" className="h-auto w-full justify-start px-2 py-1.5 text-left" onClick={() => onAbrirConversa(a.id)}>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">
                  {a.ultima_msg_em ? new Date(a.ultima_msg_em).toLocaleDateString("pt-BR") : ""} · {a.unidade_nome ?? "sem unidade"}
                </p>
                <p className="truncate text-xs">{a.ultima_msg_texto}</p>
              </div>
              <ExternalLink className="ml-auto h-3 w-3 shrink-0 opacity-50" />
            </Button>
          ))
        )}
      </Secao>
    </div>
  );
};
