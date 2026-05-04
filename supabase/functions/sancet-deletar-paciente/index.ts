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

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })
    if (!isAdmin) return json({ error: 'Apenas administradores podem excluir pacientes' }, 403)

    const { paciente_id } = await req.json()
    if (!paciente_id) return json({ error: 'paciente_id obrigatório' }, 400)

    // 1. Buscar paciente
    const { data: pac, error: errPac } = await supabase
      .from('pacientes').select('id, cpf, email').eq('id', paciente_id).maybeSingle()
    if (errPac) return json({ error: errPac.message }, 500)
    if (!pac) return json({ error: 'Paciente não encontrado' }, 404)

    // 2. Buscar pedidos
    const { data: pedidos } = await supabase
      .from('pedidos').select('id, protocolo').eq('paciente_id', paciente_id)
    const pedidosArr = pedidos ?? []

    // 3. Para cada pedido, apagar arquivos
    for (const p of pedidosArr) {
      await removerPasta(supabase, 'documentos-pedidos', p.id)
      await removerPasta(supabase, 'imagens-exames', `resultados/${p.id}`)
      // Resultados podem ter sido salvos por protocolo também
      await supabase.from('resultados').delete().eq('pedido_protocolo', p.protocolo)
    }

    // 4. Deletar pedidos
    if (pedidosArr.length > 0) {
      const { error: errPed } = await supabase.from('pedidos').delete().eq('paciente_id', paciente_id)
      if (errPed) return json({ error: 'Erro ao apagar pedidos: ' + errPed.message }, 500)
    }

    // 5. Deletar resultados pelo CPF (caso ainda restem)
    await supabase.from('resultados').delete().eq('paciente_cpf', pac.cpf)

    // 6. Deletar paciente
    const { error: errDel } = await supabase.from('pacientes').delete().eq('id', paciente_id)
    if (errDel) return json({ error: 'Erro ao apagar paciente: ' + errDel.message }, 500)

    // 7. Tentar apagar auth user pelo email (se existir e não for staff)
    if (pac.email) {
      try {
        const { data: lista } = await supabase.auth.admin.listUsers()
        const authUser = lista?.users?.find((u: any) => u.email?.toLowerCase() === pac.email!.toLowerCase())
        if (authUser) {
          const { data: isStaff } = await supabase
            .from('user_roles').select('id').eq('user_id', authUser.id).maybeSingle()
          if (!isStaff) {
            await supabase.auth.admin.deleteUser(authUser.id)
          }
        }
      } catch (_) { /* best-effort */ }
    }

    return json({ ok: true, pedidos_apagados: pedidosArr.length })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
