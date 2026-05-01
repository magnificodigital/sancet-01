import { useEffect, useMemo, useState } from "react";
import { Building2, MapPin, Phone, Mail, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UnidadeRow = {
  id: string;
  nome: string;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  email: string | null;
  horarios: any;
  foto_url: string | null;
  aceita_domicilio: boolean;
};

type Unidade = Omit<UnidadeRow, "horarios"> & { horario: string | null };

const Unidades = () => {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [cidade, setCidade] = useState<string>("__all__");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("unidades_cache")
        .select("id, nome, endereco, bairro, cidade, uf, telefone, email, horarios, foto_url, aceita_domicilio")
        .eq("ativo", true)
        .order("nome");
      const lista: Unidade[] = (data ?? []).map((u: any) => ({
        id: u.id,
        nome: u.nome,
        endereco: u.endereco,
        bairro: u.bairro,
        cidade: u.cidade,
        uf: u.uf,
        telefone: u.telefone,
        email: u.email,
        foto_url: u.foto_url,
        aceita_domicilio: !!u.aceita_domicilio,
        horario: typeof u.horarios === "string" ? u.horarios : (u.horarios?.texto ?? null),
      }));
      setUnidades(lista);
      setLoading(false);
    })();
  }, []);

  const cidades = useMemo(() => {
    const set = new Set<string>();
    unidades.forEach((u) => u.cidade && set.add(u.cidade));
    return Array.from(set).sort();
  }, [unidades]);

  const filtradas = useMemo(() => {
    if (cidade === "__all__") return unidades;
    return unidades.filter((u) => u.cidade === cidade);
  }, [unidades, cidade]);

  return (
    <PageShell>
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4 text-center" style={{ color: "#1B3A6B" }}>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Nossas Unidades</h1>
          <p className="opacity-80">Encontre a unidade mais próxima de você</p>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4">
          {cidades.length > 1 && (
            <div className="mb-6 max-w-xs">
              <Select value={cidade} onValueChange={setCidade}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por cidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as cidades</SelectItem>
                  {cidades.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border shadow-sm bg-white overflow-hidden animate-pulse">
                  <div className="h-48 w-full bg-gray-100" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-gray-100 rounded w-2/3" />
                    <div className="h-4 bg-gray-100 rounded w-full" />
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtradas.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Nenhuma unidade encontrada.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtradas.map((u) => (
                <div key={u.id} className="rounded-xl border shadow-sm bg-white overflow-hidden flex flex-col">
                  {u.foto_url ? (
                    <img src={u.foto_url} alt={u.nome} className="h-48 w-full object-cover" />
                  ) : (
                    <div className="h-48 w-full bg-gray-100 flex items-center justify-center">
                      <Building2 className="h-16 w-16 text-gray-300" />
                    </div>
                  )}
                  <div className="p-4 space-y-2 flex-1 flex flex-col">
                    <h3 className="font-semibold text-secondary text-lg">{u.nome}</h3>
                    {(u.endereco || u.bairro) && (
                      <p className="text-sm text-muted-foreground flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{[u.endereco, u.bairro].filter(Boolean).join(" — ")}</span>
                      </p>
                    )}
                    {(u.cidade || u.uf) && (
                      <p className="text-sm text-muted-foreground">
                        {[u.cidade, u.uf].filter(Boolean).join(" / ")}
                      </p>
                    )}
                    {u.telefone && (
                      <a href={`tel:${u.telefone}`} className="text-sm flex items-center gap-2 hover:underline">
                        <Phone className="h-4 w-4 shrink-0" />
                        {u.telefone}
                      </a>
                    )}
                    {u.email && (
                      <a href={`mailto:${u.email}`} className="text-sm flex items-center gap-2 hover:underline break-all">
                        <Mail className="h-4 w-4 shrink-0" />
                        {u.email}
                      </a>
                    )}
                    {u.horario && (
                      <p className="text-sm text-muted-foreground flex items-start gap-2">
                        <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{u.horario}</span>
                      </p>
                    )}
                    {u.aceita_domicilio && (
                      <span
                        className="inline-block self-start mt-2 px-3 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: "#C8102E" }}
                      >
                        Atende em domicílio
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
};

export default Unidades;
