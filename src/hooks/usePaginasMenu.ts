import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ItemMenu = { to: string; titulo: string; ordem: number };

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
      const [cms, landings] = await Promise.all([
        supabase
          .from("paginas")
          .select("slug, titulo, ordem_menu")
          .eq("no_menu", true)
          .eq("ativa", true),
        supabase
          .from("landing_pages")
          .select("slug, titulo, ordem_menu")
          .eq("no_menu", true)
          .eq("publicado", true),
      ]);
      if (!ativo) return;
      const dados: ItemMenu[] = [
        ...((cms.data ?? []).map((p: any) => ({
          to: `/${p.slug}`,
          titulo: p.titulo,
          ordem: p.ordem_menu ?? 0,
        }))),
        ...((landings.data ?? []).map((p: any) => ({
          to: `/p/${p.slug}`,
          titulo: p.titulo,
          ordem: p.ordem_menu ?? 0,
        }))),
      ].sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo));
      cache = { dados, ts: Date.now() };
      setItens(dados);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  return itens;
};
