// Helpers compartilhados para chamadas SOAP ao Shift LIS

export const SOAP_HEADERS = {
  "Content-Type": "text/xml; charset=utf-8",
  "SOAPAction": '""',
  "Accept": "text/xml",
};

export function buildEnvelope(method: string, body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<x:Envelope xmlns:x="http://schemas.xmlsoap.org/soap/envelope/" xmlns:www="http://www.shift.com.br">
  <x:Header/>
  <x:Body>
    <www:${method}>
      ${body}
    </www:${method}>
  </x:Body>
</x:Envelope>`;
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

const DEFAULT_SHIFT_ENDPOINT_CONSULTAS =
  "https://sancet.shiftcloud.com.br/shift/lis/sancet/elis/s01.util.b2b.shift.consultas.Webserver.cls";

const DEFAULT_SHIFT_ENDPOINT_MOBILE =
  "https://sancet.shiftcloud.com.br/shift/lis/sancet/elis/s01.util.b2b.integracaoMobile.Webserver.cls";

export async function loadShiftConfig(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("configuracoes")
    .select("chave, valor")
    .in("chave", ["SHIFT_ENDPOINT", "SHIFT_ENDPOINT_MOBILE", "SHIFT_USER_ID", "SHIFT_SENHA"]);

  if (error) throw new Error("Erro ao ler configurações Shift: " + error.message);

  const cfg: Record<string, string> = {};
  (data ?? []).forEach((r: any) => { cfg[r.chave] = r.valor; });

  const endpoint = cfg["SHIFT_ENDPOINT"] || Deno.env.get("SHIFT_ENDPOINT") || DEFAULT_SHIFT_ENDPOINT_CONSULTAS;
  const endpointMobile = cfg["SHIFT_ENDPOINT_MOBILE"] || Deno.env.get("SHIFT_ENDPOINT_MOBILE") || DEFAULT_SHIFT_ENDPOINT_MOBILE;
  let userId: string | null = cfg["SHIFT_USER_ID"] || Deno.env.get("SHIFT_USER_ID") || null;
  let senha: string | null  = cfg["SHIFT_SENHA"]   || Deno.env.get("SHIFT_SENHA")   || null;
  if (userId === "PENDENTE") userId = null;
  if (senha === "PENDENTE")  senha  = null;

  return { endpoint, endpointMobile, userId, senha };
}

/** Monta as tags <www:pUserId>/<www:pSenha> apenas quando ambas existirem. */
export function buildAuthTags(userId: string | null, senha: string | null): string {
  if (!userId || !senha) return "";
  return `<www:pUserId>${userId}</www:pUserId><www:pSenha>${senha}</www:pSenha>`;
}
