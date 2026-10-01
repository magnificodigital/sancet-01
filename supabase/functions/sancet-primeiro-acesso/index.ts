// DESATIVADA: o "primeiro acesso" foi unificado no cadastro (/cadastro).
// Ela permitia criar acesso a um paciente existente só com CPF + data de
// nascimento. Mantida respondendo 410 para quem ainda chamar.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(
    JSON.stringify({ error: "Use 'Fazer cadastro' para criar seu acesso." }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
