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

    // Valida o JWT explicitamente. Não use getUser() sem contexto de sessão em Edge Function,
    // pois pode retornar "Auth session missing!" mesmo com Authorization presente.
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token)
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Não autorizado: ' + (claimsError?.message ?? 'sessão inválida') }), { status: 401, headers: corsHeaders })
    }
    const requesterId = claimsData.claims.sub

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE)

    const { data: isAdmin, error: rpcError } = await supabaseAdmin
      .rpc('has_role', { _user_id: requesterId, _role: 'admin' })

    if (rpcError) {
      return new Response(JSON.stringify({ error: 'Erro RPC: ' + rpcError.message }), { status: 500, headers: corsHeaders })
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Acesso negado (apenas admin)' }), { status: 403, headers: corsHeaders })
    }

    const { nome, email, senha, permissoes, role } = await req.json()
    const roleFinal = role === 'admin' ? 'admin' : 'staff'

    const { data: novoUser, error: erroCriar } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { is_staff: true, nome },
    })
    if (erroCriar || !novoUser?.user) {
      return new Response(JSON.stringify({ error: erroCriar?.message ?? 'Erro ao criar usuário' }), { status: 400, headers: corsHeaders })
    }

    const { error: erroRole } = await supabaseAdmin.from('user_roles').insert({
      user_id: novoUser.user.id,
      role: roleFinal,
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
