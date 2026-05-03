import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useSacola } from "@/stores/sacola";
import { toast } from "sonner";
import type { ConfigExamesDestaque } from "../tipos";

const VERMELHO = "#C8102E";
const AZUL = "#1B3A6B";

type ExameRow = {
  id: string;
  codigo_shift: string;
  nome: string;
  descricao: string | null;
  preco_centavos: number | null;
  prazo_resultado: string | null;
  preparo: string | null;
  outros_nomes: string[] | null;
  disponivel_em_casa: boolean;
  disponivel_na_unidade: boolean;
};

const formatarPreco = (centavos: number | null) => {
  if (centavos == null) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
};

export const BlocoExamesDestaque = ({ config }: { config: ConfigExamesDestaque }) => {
  const [exames, setExames] = useState<ExameRow[]>([]);
  const adicionar = useSacola((s) => s.adicionar);

  useEffect(() => {
    if (!config.exames_ids || config.exames_ids.length === 0) {
      setExames([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("exames_cache")
        .select("id, codigo_shift, nome, descricao, preco_centavos, prazo_resultado, preparo, outros_nomes, disponivel_em_casa, disponivel_na_unidade")
        .in("id", config.exames_ids);
      const mapa = new Map((data ?? []).map((e: any) => [e.id, e as ExameRow]));
      // Manter ordem definida em config
      const ordenados = config.exames_ids.map((id) => mapa.get(id)).filter(Boolean) as ExameRow[];
      setExames(ordenados);
    })();
  }, [JSON.stringify(config.exames_ids)]);

  const handleAdicionar = (e: ExameRow) => {
    adicionar({
      codigoShift: e.codigo_shift,
      tipo: "exame",
      nome: e.nome,
      outrosNomes: (e.outros_nomes ?? []).join(", "),
      precoCentavos: e.preco_centavos,
      prazoResultado: e.prazo_resultado,
      preparo: e.preparo,
      disponivelNaUnidade: e.disponivel_na_unidade,
      disponivelEmCasa: e.disponivel_em_casa,
    });
    toast.success(`${e.nome} adicionado à sacola`);
  };

  return (
    <section className="w-full py-16 px-6" style={{ backgroundColor: "#F5F5F5" }}>
      <div className="max-w-[1200px] mx-auto">
        {config.titulo_secao && (
          <h2 className="text-3xl font-bold text-center mb-2" style={{ color: AZUL }}>
            {config.titulo_secao}
          </h2>
        )}
        {config.subtitulo_secao && (
          <p className="text-center text-gray-600 mb-10">{config.subtitulo_secao}</p>
        )}
        {exames.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-10">
            Nenhum exame selecionado
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {exames.map((e) => (
              <div key={e.id} className="bg-white rounded-xl p-5 shadow-sm flex flex-col gap-3">
                <div>
                  <p className="text-xs text-gray-500">Cód. {e.codigo_shift}</p>
                  <h3 className="text-lg font-semibold mt-1" style={{ color: AZUL }}>
                    {e.nome}
                  </h3>
                </div>
                {e.descricao && (
                  <p className="text-sm text-gray-600 line-clamp-2">{e.descricao}</p>
                )}
                <p className="text-xl font-bold mt-auto" style={{ color: VERMELHO }}>
                  {formatarPreco(e.preco_centavos)}
                </p>
                {config.mostrar_botao_carrinho && (
                  <Button
                    onClick={() => handleAdicionar(e)}
                    className="w-full text-white gap-2"
                    style={{ backgroundColor: VERMELHO }}
                  >
                    <ShoppingCart className="h-4 w-4" /> Adicionar ao carrinho
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
