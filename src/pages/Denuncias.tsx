import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NATUREZAS = [
  "Desvio de conduta / comportamental",
  "Assédio (moral ou sexual)",
  "Violação de política, norma ou procedimento",
  "Corrupção / compliance",
  "Discriminação / intolerância",
  "Violência contra a mulher",
  "Outro",
];
const ENVOLVIDOS = ["Colaborador", "Fornecedor", "Prestador de serviço", "Outro"];
const MAX_BYTES = 10 * 1024 * 1024;

const Denuncias = () => {
  const [maioridade, setMaioridade] = useState(false);
  const [natureza, setNatureza] = useState("");
  const [envolvido, setEnvolvido] = useState("");
  const [data, setData] = useState("");
  const [descricao, setDescricao] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const addArquivo = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast.error("Arquivo muito grande (máx. 10 MB).");
      return;
    }
    if (arquivos.length >= 2) {
      toast.error("Máximo de 2 anexos.");
      return;
    }
    setArquivos((prev) => [...prev, f]);
  };

  const enviar = async () => {
    if (!maioridade) return toast.error("Confirme que é maior de 18 anos.");
    if (!descricao.trim()) return toast.error("Descreva o ocorrido.");
    setEnviando(true);
    try {
      // Upload dos anexos (pasta denuncias/). Não bloqueia a denúncia se falhar.
      const paths: string[] = [];
      let falhaAnexo = false;
      for (const f of arquivos) {
        const ext = f.name.split(".").pop();
        const path = `denuncias/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("documentos-pedidos")
          .upload(path, f);
        if (upErr) {
          falhaAnexo = true;
          continue;
        }
        paths.push(path);
      }
      if (falhaAnexo) {
        toast.warning("Não foi possível anexar os arquivos; a denúncia será enviada sem eles.");
      }

      const { data: resp, error } = await supabase.functions.invoke("sancet-denuncia", {
        body: {
          maioridade,
          natureza,
          tipo_envolvido: envolvido,
          data_ocorrido: data,
          descricao: descricao.trim(),
          anexos: paths,
        },
      });
      if (error || (resp as any)?.ok === false) {
        let msg = (resp as any)?.reason as string | undefined;
        if (!msg && error) {
          try {
            const body = await (error as any).context?.json?.();
            msg = body?.reason;
          } catch { /* ignora */ }
        }
        throw new Error(msg || "Não foi possível enviar.");
      }
      setEnviado(true);
      toast.success("Denúncia enviada com sigilo. Obrigado.");
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível enviar.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PageShell>
      <section className="container max-w-2xl py-10">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-secondary hover:underline mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-6 w-6 text-brand" />
          <h1 className="text-2xl md:text-3xl font-bold text-secondary">Canal de Denúncias</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Espaço seguro e confidencial para relatar condutas inadequadas. Sua identidade é preservada.
        </p>

        {enviado ? (
          <div className="rounded-xl border bg-card p-6 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-brand mb-2" />
            <p className="font-semibold text-secondary">Denúncia registrada com sigilo.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Agradecemos por contribuir com um ambiente ético e seguro.
            </p>
          </div>
        ) : (
          <div className="space-y-5 rounded-xl border bg-card p-5">
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={maioridade} onCheckedChange={(v) => setMaioridade(v === true)} className="mt-0.5" />
              <span>Declaro, sob as penas da lei, que sou maior de 18 anos.</span>
            </label>

            <div className="space-y-1.5">
              <Label>Natureza do ocorrido</Label>
              <Select value={natureza} onValueChange={setNatureza}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {NATUREZAS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo de envolvido</Label>
                <Select value={envolvido} onValueChange={setEnvolvido}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {ENVOLVIDOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data do ocorrido</Label>
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descreva o ocorrido *</Label>
              <Textarea rows={6} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Relate os fatos com o máximo de detalhes possível." />
            </div>

            <div className="space-y-1.5">
              <Label>Anexos (opcional, até 2 — máx. 10 MB cada)</Label>
              <div className="space-y-2">
                {arquivos.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-sm">
                    <span className="truncate flex-1">{f.name}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => setArquivos((prev) => prev.filter((_, idx) => idx !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {arquivos.length < 2 && (
                  <label className="inline-flex">
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => addArquivo(e.target.files?.[0] ?? null)} />
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span className="cursor-pointer gap-2"><Upload className="h-4 w-4" /> Anexar arquivo</span>
                    </Button>
                  </label>
                )}
              </div>
            </div>

            <Button onClick={enviar} disabled={enviando} className="w-full bg-brand hover:bg-brand-hover text-white">
              {enviando ? "Enviando..." : "Enviar denúncia"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              As informações são tratadas com confidencialidade, conforme nossa Política de Privacidade.
            </p>
          </div>
        )}
      </section>
    </PageShell>
  );
};

export default Denuncias;
