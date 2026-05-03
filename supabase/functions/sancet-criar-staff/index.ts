import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders })
    }

    // Verifica se é admin via RPC (chama a função has_role do Postgres)
    const { data: isAdmin, error: rpcError } = await supabaseAdmin
      .rpc('has_role', { _user_id: user.id, _role: 'admin' })

    if (rpcError) {
      return new Response(JSON.stringify({ error: 'Erro RPC: ' + rpcError.message }), { status: 500, headers: corsHeaders })
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403, headers: corsHeaders })
    }

    const { nome, email, senha, permissoes } = await req.json()

    const { data: novoUser, error: erroCriar } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })
    if (erroCriar || !novoUser?.user) {
      return new Response(JSON.stringify({ error: erroCriar?.message ?? 'Erro ao criar usuário' }), { status: 400, headers: corsHeaders })
    }

    const { error: erroRole } = await supabaseAdmin.from('user_roles').insert({
      user_id: novoUser.user.id,
      role: 'staff',
      nome,
      email,
      permissoes,
    })
    if (erroRole) {
      return new Response(JSON.stringify({ error: erroRole.message }), { status: 400, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})
