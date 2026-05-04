import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

async function esvaziarBucket(supabase: any, bucket: string, prefix = '') {
  try {
    const { data: items } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 })
    if (!items || items.length === 0) return
    const arquivos: string[] = []
    const pastas: string[] = []
    for (const it of items) {
      const path = prefix ? `${prefix}/${it.name}` : it.name
      // Pasta tem id null no metadata
      if (it.id === null || it.metadata === null) pastas.push(path)
      else arquivos.push(path)
    }
    if (arquivos.length > 0) await supabase.storage.from(bucket).remove(arquivos)
    for (const sub of pastas) await esvaziarBucket(supabase, bucket, sub)
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

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })
    if (!isAdmin) return json({ error: 'Apenas administradores' }, 403)

    // Conta antes
    const { count: nPac } = await supabase.from('pacientes').select('id', { count: 'exact', head: true })
    const { count: nPed } = await supabase.from('pedidos').select('id', { count: 'exact', head: true })

    // 1. Esvaziar storage
    await esvaziarBucket(supabase, 'documentos-pedidos')
    await esvaziarBucket(supabase, 'imagens-exames', 'resultados')

    // 2. Apagar tabelas (ordem)
    const r1 = await supabase.from('resultados').delete().not('id', 'is', null)
    if (r1.error) return json({ error: 'resultados: ' + r1.error.message }, 500)
    const r2 = await supabase.from('pedidos').delete().not('id', 'is', null)
    if (r2.error) return json({ error: 'pedidos: ' + r2.error.message }, 500)
    const r3 = await supabase.from('pacientes').delete().not('id', 'is', null)
    if (r3.error) return json({ error: 'pacientes: ' + r3.error.message }, 500)

    // 3. Apagar auth users que NÃO estão em user_roles
    try {
      const { data: staff } = await supabase.from('user_roles').select('user_id')
      const staffIds = new Set((staff ?? []).map((s: any) => s.user_id))
      const { data: lista } = await supabase.auth.admin.listUsers({ perPage: 1000 } as any)
      for (const u of (lista?.users ?? [])) {
        if (!staffIds.has(u.id)) {
          await supabase.auth.admin.deleteUser(u.id)
        }
      }
    } catch (_) { /* best-effort */ }

    return json({ ok: true, pacientes: nPac ?? 0, pedidos: nPed ?? 0 })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
