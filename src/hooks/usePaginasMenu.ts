import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ItemMenu = { slug: string; titulo: string };

let cache: { dados: ItemMenu[]; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

export const usePaginasMenu = () => {
  const [itens, setItens] = useState<ItemMenu[]>(cache?.dados ?? []);

  useEffect(() => {
    const agora = Date.now();
    if (cache && agora - cache.ts < TTL) {
      setItens(cache.dados);
      return;
    }
    let ativo = true;
    (async () => {
      const { data } = await supabase
        .from("paginas")
        .select("slug, titulo")
        .eq("no_menu", true)
        .eq("ativa", true)
        .order("ordem_menu", { ascending: true });
      if (!ativo) return;
      const dados = (data as ItemMenu[]) ?? [];
      cache = { dados, ts: Date.now() };
      setItens(dados);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  return itens;
};
