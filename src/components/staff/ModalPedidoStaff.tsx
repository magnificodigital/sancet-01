import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Upload, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BadgeStatus } from "./BadgeStatus";
import {
  formatarData,
  formatarPreco,
  Pedido,
  STATUS_OPTIONS,
} from "./utils";

type Props = {
  pedido: Pedido | null;
  onClose: () => void;
  onSalvo?: () => void;
};

type PacienteFull = {
  nome: string | null;
  cpf: string;
  email: string | null;
  celular: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
};

const DocLink = ({ label, url }: { label: string; url: string | null }) => {
  const [open, setOpen] = useState(false);
  if (!url) return null;
  const abrir = async () => {
    setOpen(true);
    try {
      // Se for um path do bucket, gera signed URL; se for http(s) já completo, abre direto
      if (url.startsWith("http://") || url.startsWith("https://")) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const { data, error } = await supabase.storage
          .from("documentos-pedidos")
          .createSignedUrl(url, 300);
        if (error || !data) throw error ?? new Error("Sem URL");
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      toast.error("Não foi possível abrir o documento");
    } finally {
      setOpen(false);
    }
  };
  return (
    <Button variant="outline" onClick={abrir} disabled={open} className="w-full justify-between">
      {label}
      <ExternalLink className="h-4 w-4" />
    </Button>
  );
};

export const ModalPedidoStaff = ({ pedido, onClose, onSalvo }: Props) => {
  const [novoStatus, setNovoStatus] = useState<string>(pedido?.status ?? "novo");
  const [salvando, setSalvando] = useState(false);
  const [paciente, setPaciente] = useState<PacienteFull | null>(null);
  const [resultados, setResultados] = useState<
    Array<{ id: string; nome_arquivo: string; arquivo_url: string; created_at: string }>
  >([]);
  const [uploadando, setUploadando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const carregarResultados = async (protocolo: string) => {
    const { data } = await supabase
      .from("resultados")
      .select("id,nome_arquivo,arquivo_url,created_at")
      .eq("pedido_protocolo", protocolo)
      .order("created_at", { ascending: false });
    setResultados((data as any) ?? []);
  };

  useEffect(() => {
    if (!pedido) return;
    setNovoStatus(pedido.status);
    setPaciente(null);
    setResultados([]);
    carregarResultados(pedido.protocolo);
    if (pedido.paciente_id) {
      supabase
        .from("pacientes")
        .select(
          "nome, cpf, email, celular, cep, logradouro, numero, complemento, bairro, cidade, uf",
        )
        .eq("id", pedido.paciente_id)
        .maybeSingle()
        .then(({ data }) => setPaciente((data as PacienteFull) ?? null));
    }
  }, [pedido]);

  if (!pedido) return null;

  const itens: any[] = Array.isArray(pedido.itens) ? pedido.itens : [];
  const mudouStatus = novoStatus !== pedido.status;

  const salvarStatus = async () => {
    setSalvando(true);
    const { error } = await supabase
      .from("pedidos")
      .update({ status: novoStatus })
      .eq("id", pedido.id);
    setSalvando(false);
    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    toast.success("Status atualizado!");
    onSalvo?.();
    onClose();
  };

  const onSelecionarArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !pedido) return;
    setUploadando(true);
    try {
      const path = `resultados/${pedido.protocolo}-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("imagens-exames")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("imagens-exames").getPublicUrl(path);
      const { error: insErr } = await supabase.from("resultados").insert({
        pedido_protocolo: pedido.protocolo,
        paciente_cpf: pedido.paciente_cpf,
        nome_arquivo: file.name,
        arquivo_url: pub.publicUrl,
      });
      if (insErr) throw insErr;
      await carregarResultados(pedido.protocolo);
      toast.success("Resultado enviado!");
    } catch (err) {
      toast.error("Erro ao enviar resultado");
    } finally {
      setUploadando(false);
    }
  };

  const excluirResultado = async (id: string, arquivoUrl: string) => {
    if (!pedido) return;
    try {
      const marker = "/imagens-exames/";
      const idx = arquivoUrl.indexOf(marker);
      const path = idx >= 0 ? arquivoUrl.slice(idx + marker.length) : null;
      const { error: delErr } = await supabase.from("resultados").delete().eq("id", id);
      if (delErr) throw delErr;
      if (path) {
        await supabase.storage.from("imagens-exames").remove([path]);
      }
      await carregarResultados(pedido.protocolo);
      toast.success("Resultado excluído");
    } catch {
      toast.error("Erro ao excluir resultado");
    }
  };

  return (
    <Sheet open={!!pedido} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[560px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{pedido.protocolo}</span>
            <BadgeStatus status={pedido.status} />
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="dados" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="dados" className="flex-1">Dados do pedido</TabsTrigger>
            <TabsTrigger value="paciente" className="flex-1">Paciente</TabsTrigger>
            <TabsTrigger value="docs" className="flex-1">Documentos</TabsTrigger>
            <TabsTrigger value="resultados" className="flex-1">Resultados</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4 pt-4">
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Tipo:</span>{" "}
                {pedido.tipo_solicitacao === "convenio" ? "Convênio" : "Particular"}
              </p>
              <p>
                <span className="text-muted-foreground">Modalidade:</span>{" "}
                {pedido.modalidade_coleta === "domicilio" ? "Em domicílio" : "Na unidade"}
              </p>
              {pedido.modalidade_coleta === "unidade" && pedido.unidade_nome && (
                <p>
                  <span className="text-muted-foreground">Unidade:</span> {pedido.unidade_nome}
                </p>
              )}
              {pedido.modalidade_coleta === "domicilio" && pedido.endereco_coleta && (
                <p className="text-muted-foreground">
                  Endereço: {JSON.stringify(pedido.endereco_coleta)}
                </p>
              )}
              {pedido.tipo_solicitacao === "convenio" && (
                <>
                  <p>
                    <span className="text-muted-foreground">Convênio:</span>{" "}
                    {pedido.convenio_nome ?? "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Carteirinha:</span>{" "}
                    {pedido.numero_carteirinha ?? "—"}
                  </p>
                </>
              )}
              <p>
                <span className="text-muted-foreground">Termos aceitos:</span>{" "}
                {pedido.termos_aceitos ? "Sim" : "Não"}
                {pedido.termos_aceitos_em && ` em ${formatarData(pedido.termos_aceitos_em)}`}
              </p>
            </div>

            <div className="rounded-lg border bg-white">
              <p className="border-b px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
                Exames e vacinas
              </p>
              <ul className="divide-y">
                {itens.map((it: any, idx: number) => (
                  <li key={idx} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="truncate pr-3">{it.nome ?? it.codigoShift ?? "—"}</span>
                    <span className="font-medium">
                      {formatarPreco(it.precoCentavos ?? it.preco_centavos)}
                    </span>
                  </li>
                ))}
                {itens.length === 0 && (
                  <li className="px-3 py-3 text-sm text-muted-foreground">Sem itens</li>
                )}
              </ul>
              <div className="flex items-center justify-between border-t px-3 py-2 text-sm font-bold">
                <span>Total</span>
                <span>{formatarPreco(pedido.valor_total_centavos)}</span>
              </div>
            </div>

            {pedido.observacoes && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Observações
                </p>
                {pedido.observacoes}
              </div>
            )}

            <div className="space-y-2 rounded-lg border bg-white p-3">
              <label className="text-sm font-medium">Alterar status:</label>
              <Select value={novoStatus} onValueChange={setNovoStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mudouStatus && (
                <Button
                  className="mt-2 w-full text-white"
                  style={{ backgroundColor: "#C8102E" }}
                  onClick={salvarStatus}
                  disabled={salvando}
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="paciente" className="space-y-2 pt-4 text-sm">
            {!paciente ? (
              <p className="text-muted-foreground">
                Carregando dados do paciente...
              </p>
            ) : (
              <div className="space-y-1">
                <p><span className="text-muted-foreground">Nome:</span> {paciente.nome ?? "—"}</p>
                <p><span className="text-muted-foreground">CPF:</span> {paciente.cpf}</p>
                <p><span className="text-muted-foreground">E-mail:</span> {paciente.email ?? "—"}</p>
                <p><span className="text-muted-foreground">Celular:</span> {paciente.celular ?? "—"}</p>
                <p>
                  <span className="text-muted-foreground">Endereço:</span>{" "}
                  {[
                    paciente.logradouro,
                    paciente.numero,
                    paciente.complemento,
                    paciente.bairro,
                    paciente.cidade && paciente.uf
                      ? `${paciente.cidade}/${paciente.uf}`
                      : paciente.cidade,
                    paciente.cep,
                  ].filter(Boolean).join(", ") || "—"}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="docs" className="space-y-2 pt-4">
            {!pedido.url_receita &&
              !pedido.url_pedido_medico &&
              !pedido.url_carteirinha &&
              !pedido.url_identidade ? (
                <p className="text-sm text-muted-foreground">Nenhum documento enviado</p>
              ) : (
                <>
                  <DocLink label="Ver receita" url={pedido.url_receita} />
                  <DocLink label="Ver pedido médico" url={pedido.url_pedido_medico} />
                  <DocLink label="Ver carteirinha" url={pedido.url_carteirinha} />
                  <DocLink label="Ver identidade" url={pedido.url_identidade} />
                </>
              )}
          </TabsContent>

          <TabsContent value="resultados" className="space-y-3 pt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={onSelecionarArquivo}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadando}
            >
              {uploadando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploadando ? "Enviando..." : "Upload de resultado"}
            </Button>

            {resultados.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum resultado enviado</p>
            ) : (
              <ul className="divide-y rounded-lg border bg-white">
                {resultados.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.nome_arquivo}</p>
                      <p className="text-xs text-muted-foreground">{formatarData(r.created_at)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(r.arquivo_url, "_blank", "noopener,noreferrer")}
                    >
                      Abrir
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => excluirResultado(r.id, r.arquivo_url)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
