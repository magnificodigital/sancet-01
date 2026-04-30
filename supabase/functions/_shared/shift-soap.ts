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

export function requireShiftEnv() {
  const endpoint = Deno.env.get("SHIFT_ENDPOINT");
  const userId = Deno.env.get("SHIFT_USER_ID");
  const senha = Deno.env.get("SHIFT_SENHA");
  if (!endpoint || !userId || !senha) {
    throw new Error(
      "Credenciais Shift ausentes. Configure SHIFT_ENDPOINT, SHIFT_USER_ID e SHIFT_SENHA nos Secrets das Edge Functions.",
    );
  }
  return { endpoint, userId, senha };
}
