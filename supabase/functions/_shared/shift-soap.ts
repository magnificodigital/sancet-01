// Helpers compartilhados para chamadas SOAP ao Shift LIS
// Configure no Supabase Dashboard → Settings → Edge Functions → Secrets:
//   SHIFT_ENDPOINT, SHIFT_USER_ID, SHIFT_SENHA

export const SOAP_HEADERS = {
  "Content-Type": "text/xml;charset=UTF-8",
  "SOAPAction": "",
};

export function buildEnvelope(method: string, body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="WebServices">
  <soapenv:Header/>
  <soapenv:Body>
    <web:${method}>
      ${body}
    </web:${method}>
  </soapenv:Body>
</soapenv:Envelope>`;
}

export function extractTagValue(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : "";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getter(bloco: string) {
  return (tag: string) => {
    const r = bloco.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
    return r ? r[1].trim() : "";
  };
}

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function loadShiftConfig(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("configuracoes")
    .select("chave, valor")
    .in("chave", ["SHIFT_ENDPOINT", "SHIFT_USER_ID", "SHIFT_SENHA"]);

  if (error) throw new Error("Erro ao ler configurações Shift: " + error.message);

  const cfg: Record<string, string> = {};
  (data ?? []).forEach((r: any) => { cfg[r.chave] = r.valor; });

  const endpoint = cfg["SHIFT_ENDPOINT"];
  const userId   = cfg["SHIFT_USER_ID"];
  const senha    = cfg["SHIFT_SENHA"];

  if (!endpoint || !userId || !senha || userId === "PENDENTE" || senha === "PENDENTE") {
    throw new Error("Credenciais Shift não configuradas. Acesse o painel admin → Configurações.");
  }

  return { endpoint, userId, senha };
}
