import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')
    console.log('[1] authHeader:', authHeader ? 'presente' : 'ausente')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders })
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseUser.auth.getUser()
    console.log('[2] user:', user?.id ?? 'null')
    if (!user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders })
    }

    // Usa admin client (service role) para verificar o papel, bypassa RLS
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()
    console.log('[3] roleData:', JSON.stringify(roleData))

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403, headers: corsHeaders })
    }

    const { nome, email, senha, permissoes } = await req.json()
    console.log('[4] body recebido:', nome, email)

    const { data: novoUser, error: erroCriar } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })
    if (erroCriar || !novoUser?.user) {
      return new Response(JSON.stringify({ error: erroCriar?.message ?? 'Erro ao criar usuário' }), { status: 400, headers: corsHeaders })
    }
    console.log('[5] novo user criado:', novoUser?.user?.id)

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
    console.error('[ERRO]', String(e))
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})
