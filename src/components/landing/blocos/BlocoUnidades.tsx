import { useQuery } from "@tanstack/react-query";
import { MapPin, Phone, Clock, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ConfigUnidades } from "../tipos";

const VERMELHO = "hsl(var(--brand))";
const AZUL = "hsl(var(--brand-2))";

type UnidadeRow = {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  foto_url: string | null;
  horarios: any;
};

const textoHorario = (h: any): string | null =>
  (typeof h === "object" && h?.texto) || (typeof h === "string" ? h : null);

export const BlocoUnidades = ({ config }: { config: ConfigUnidades }) => {
  const limite = config.limite ?? 3;
  const { data } = useQuery({
    queryKey: ["bloco_unidades", limite],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades_cache")
        .select("id, nome, cidade, uf, telefone, foto_url, horarios")
        .eq("ativo", true)
        .order("nome", { ascending: true })
        .limit(limite);
      if (error) throw error;
      return (data ?? []) as UnidadeRow[];
    },
  });

  const unidades = data ?? [];

  return (
    <section className="w-full py-16 px-6 bg-white">
      <div className="max-w-[1200px] mx-auto">
        {config.titulo_tag && (
          <p className="text-center text-xs font-bold uppercase tracking-wider mb-2" style={{ color: VERMELHO }}>
            {config.titulo_tag}
          </p>
        )}
        {config.titulo_secao && (
          <h2 className="text-3xl font-bold text-center" style={{ color: AZUL }}>
            {config.titulo_secao}
          </h2>
        )}
        {config.subtitulo && (
          <p className="text-center text-gray-600 mt-2 mb-10">{config.subtitulo}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {unidades.map((u) => {
            const horario = textoHorario(u.horarios);
            return (
              <div key={u.id} className="rounded-xl border bg-card overflow-hidden shadow-sm">
                <div className="h-40 w-full bg-gray-100 flex items-center justify-center">
                  {u.foto_url ? (
                    <img src={u.foto_url} alt={u.nome} className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-12 w-12 text-gray-300" />
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-bold" style={{ color: AZUL }}>{u.nome}</h3>
                  {(u.cidade || u.uf) && (
                    <p className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 shrink-0" style={{ color: VERMELHO }} />
                      {[u.cidade, u.uf].filter(Boolean).join(" / ")}
                    </p>
                  )}
                  {u.telefone && (
                    <p className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4 shrink-0" style={{ color: VERMELHO }} />
                      {u.telefone}
                    </p>
                  )}
                  {horario && (
                    <p className="flex items-start gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4 mt-0.5 shrink-0" style={{ color: VERMELHO }} />
                      <span className="whitespace-pre-line">{horario}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <a
            href="/unidades"
            className="inline-block rounded-lg border px-5 py-2.5 text-sm font-medium transition hover:bg-muted/40"
            style={{ borderColor: AZUL, color: AZUL }}
          >
            Ver todas as unidades →
          </a>
        </div>
      </div>
    </section>
  );
};
