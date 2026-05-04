import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

async function removerPasta(supabase: any, bucket: string, prefix: string) {
  try {
    const { data: files } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 })
    if (files && files.length > 0) {
      const paths = files.map((f: any) => `${prefix}/${f.name}`)
      await supabase.storage.from(bucket).remove(paths)
    }
  } catch (_) { /* best-effort */ }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autorizado' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) return json({ error: 'Não autorizado' }, 401)

    // Admin OU staff com permissão pedidos.excluir
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })
    let autorizado = !!isAdmin
    if (!autorizado) {
      const { data: row } = await supabase
        .from('user_roles').select('permissoes').eq('user_id', user.id).maybeSingle()
      autorizado = !!(row?.permissoes as any)?.pedidos?.excluir
    }
    if (!autorizado) return json({ error: 'Sem permissão para excluir pedidos' }, 403)

    const { pedido_id } = await req.json()
    if (!pedido_id) return json({ error: 'pedido_id obrigatório' }, 400)

    const { data: pedido, error: errBusca } = await supabase
      .from('pedidos').select('id, protocolo').eq('id', pedido_id).maybeSingle()
    if (errBusca) return json({ error: errBusca.message }, 500)
    if (!pedido) return json({ error: 'Pedido não encontrado' }, 404)

    // 1. Storage
    await removerPasta(supabase, 'documentos-pedidos', pedido.id)
    await removerPasta(supabase, 'imagens-exames', `resultados/${pedido.id}`)

    // 2. Resultados
    await supabase.from('resultados').delete().eq('pedido_protocolo', pedido.protocolo)

    // 3. Pedido
    const { error: errDel } = await supabase.from('pedidos').delete().eq('id', pedido_id)
    if (errDel) return json({ error: errDel.message }, 500)

    return json({ ok: true })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
