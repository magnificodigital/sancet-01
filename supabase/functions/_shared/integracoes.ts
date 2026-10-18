// Chaves de API e modelos de IA definidos em Super Admin > Integrações.
// Ordem: cofre (integracoes_segredos) → secrets do Supabase (env).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

let cache: { em: number; segredos: Record<string, string>; modelos: Record<string, string> } | null = null;

async function carregar() {
  if (cache && Date.now() - cache.em < 30_000) return cache;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const [{ data: s }, { data: m }] = await Promise.all([
    admin.from("integracoes_segredos").select("chave, valor"),
    admin.from("plataforma_config").select("*").eq("id", 1).maybeSingle(),
  ]);
  const segredos: Record<string, string> = {};
  (s ?? []).forEach((r: any) => (segredos[r.chave] = r.valor));
  cache = { em: Date.now(), segredos, modelos: (m ?? {}) as Record<string, string> };
  return cache;
}

/** Chave de API: cofre primeiro, depois secrets do Supabase. */
export async function segredo(chave: string): Promise<string | undefined> {
  const c = await carregar().catch(() => null);
  return c?.segredos[chave]?.trim() || Deno.env.get(chave) || undefined;
}

/** Modelo de IA configurado para uma função (chat, receita, voz, transcricao). */
export async function modeloIA(funcao: "chat" | "receita" | "voz" | "transcricao", padrao: string): Promise<string> {
  const c = await carregar().catch(() => null);
  const v = String(c?.modelos?.[`modelo_${funcao}`] ?? "").trim();
  return v || padrao;
}
