import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return new Response(JSON.stringify({ error: 'Não autorizado (sem token)' }), { status: 401, headers: corsHeaders })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY)
    const { data: userData, error: userError } = await supabaseUser.auth.getUser(token)
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Não autorizado: ' + (userError?.message ?? 'sessão inválida') }), { status: 401, headers: corsHeaders })
    }
    const requester = userData.user

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE)

    const { data: isAdmin, error: rpcError } = await supabaseAdmin
      .rpc('has_role', { _user_id: requester.id, _role: 'admin' })
    if (rpcError) {
      return new Response(JSON.stringify({ error: 'Erro RPC: ' + rpcError.message }), { status: 500, headers: corsHeaders })
    }
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Acesso negado (apenas admin)' }), { status: 403, headers: corsHeaders })
    }

    const { user_id } = await req.json()
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id obrigatório' }), { status: 400, headers: corsHeaders })
    }
    if (user_id === requester.id) {
      return new Response(JSON.stringify({ error: 'Você não pode excluir a si mesmo' }), { status: 400, headers: corsHeaders })
    }

    // remove vínculos e roles primeiro
    await supabaseAdmin.from('user_unidades').delete().eq('user_id', user_id)
    await supabaseAdmin.from('user_roles').delete().eq('user_id', user_id)

    const { error: erroDel } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    if (erroDel) {
      return new Response(JSON.stringify({ error: erroDel.message }), { status: 400, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})
