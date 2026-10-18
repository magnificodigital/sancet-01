// Limite de uso por IP (e por chave extra, ex.: e-mail) contra abuso das funções
// públicas: spam de e-mail, bombardeio de código de login e gasto de IA.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export function ipDe(req: Request) {
  return (
    req.headers.get("cf-connecting-ip") ||
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "desconhecido"
  );
}

async function hash(t: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return Array.from(new Uint8Array(b)).slice(0, 12).map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** true = pode seguir; false = passou do limite. Em caso de erro, deixa passar. */
export async function dentroDoLimite(escopo: string, identificador: string, limite: number, janelaSeg: number): Promise<boolean> {
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await admin.rpc("rate_limit_consumir", {
      _chave: `${escopo}:${await hash(identificador)}`,
      _limite: limite,
      _janela_seg: janelaSeg,
    });
    if (error) return true;
    return data === true;
  } catch {
    return true;
  }
}

/** Atalho: limite por IP. */
export const ipDentroDoLimite = (req: Request, escopo: string, limite: number, janelaSeg: number) =>
  dentroDoLimite(escopo, ipDe(req), limite, janelaSeg);

export const MSG_LIMITE = "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
