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

    const { user_id } = await req.json()
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id obrigatório' }), { status: 400, headers: corsHeaders })
    }
    const negar = (msg: string) => new Response(JSON.stringify({ error: msg }), { status: 403, headers: corsHeaders })
    const { data: pode } = await supabaseAdmin.rpc('tem_permissao_uid', { _uid: requesterId, _modulo: 'equipe', _acao: 'excluir' })
    if (!pode) return negar('Sem permissão para excluir usuários da equipe')
    // Super admin só é removido por outro super admin; admin só por super admin.
    const [{ data: alvoSuper }, { data: euSuper }, { data: alvoRole }] = await Promise.all([
      supabaseAdmin.rpc('eh_super_admin_uid', { _uid: user_id }),
      supabaseAdmin.rpc('eh_super_admin_uid', { _uid: requesterId }),
      supabaseAdmin.from('user_roles').select('role').eq('user_id', user_id).maybeSingle(),
    ])
    if ((alvoSuper || alvoRole?.role === 'admin') && !euSuper) return negar('Somente o super admin pode excluir administradores')
    if (user_id === requesterId) {
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
