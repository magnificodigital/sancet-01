// Super Admin > Integrações: mostra de onde vem cada chave (cofre ou secrets
// do Supabase) e testa a conexão. Só super admin (validado pelo JWT).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const CHAVES = ["OPENROUTER_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY"];

async function testar(chave: string, valor: string): Promise<{ ok: boolean; detalhe: string }> {
  try {
    if (chave === "OPENROUTER_API_KEY") {
      const r = await fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${valor}` } });
      if (!r.ok) return { ok: false, detalhe: `OpenRouter recusou a chave (${r.status}).` };
      const d = (await r.json())?.data ?? {};
      const uso = typeof d.usage === "number" ? ` · uso US$ ${d.usage.toFixed(2)}` : "";
      const lim = d.limit == null ? " · sem limite" : ` · limite US$ ${Number(d.limit).toFixed(2)}`;
      return { ok: true, detalhe: `Chave válida${uso}${lim}` };
    }
    if (chave === "OPENAI_API_KEY") {
      const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${valor}` } });
      if (!r.ok) return { ok: false, detalhe: `OpenAI recusou a chave (${r.status}).` };
      const ids: string[] = ((await r.json())?.data ?? []).map((m: any) => m.id);
      const rt = ids.some((i) => i.includes("realtime"));
      return { ok: true, detalhe: rt ? "Chave válida · voz ao vivo disponível" : "Chave válida · ATENÇÃO: sem acesso aos modelos de voz (realtime)" };
    }
    if (chave === "ANTHROPIC_API_KEY") {
      const r = await fetch("https://api.anthropic.com/v1/models", { headers: { "x-api-key": valor, "anthropic-version": "2023-06-01" } });
      return r.ok ? { ok: true, detalhe: "Chave válida" } : { ok: false, detalhe: `Anthropic recusou a chave (${r.status}).` };
    }
    if (chave === "GEMINI_API_KEY") {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(valor)}`);
      return r.ok ? { ok: true, detalhe: "Chave válida" } : { ok: false, detalhe: `Google recusou a chave (${r.status}).` };
    }
    return { ok: false, detalhe: "Teste indisponível." };
  } catch (e) {
    return { ok: false, detalhe: `Falha de conexão: ${(e as Error).message}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const comoUsuario = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: sou } = await comoUsuario.rpc("is_super_admin");
    if (sou !== true) return json({ error: "Somente o super admin." }, 403);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: cofre } = await admin.from("integracoes_segredos").select("chave, valor");
    const noCofre = new Map((cofre ?? []).map((r: any) => [r.chave, r.valor as string]));

    const body = await req.json().catch(() => ({}));
    const alvo = typeof body.testar === "string" && CHAVES.includes(body.testar) ? body.testar : null;

    const itens = await Promise.all(
      CHAVES.map(async (chave) => {
        const v = noCofre.get(chave)?.trim() || Deno.env.get(chave) || "";
        const fonte = noCofre.get(chave)?.trim() ? "cofre" : Deno.env.get(chave) ? "secrets" : null;
        const teste = alvo === chave && v ? await testar(chave, v) : null;
        return { chave, fonte, final: v ? v.slice(-4) : null, teste };
      }),
    );
    return json({ itens });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
