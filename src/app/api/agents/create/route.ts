import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { generateApiKey, hashApiKey } from '@/lib/hash'

export async function POST(request: Request) {
  // Auth check — master uniquement
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('user_id', user.id)
    .single() as { data: { role: string; org_id: string } | null }

  if (profile?.role !== 'master') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, type, description, org_id } = await request.json()
  const admin = createAdminClient()

  // Créer l'agent
  const { data: agent, error: agentErr } = await admin
    .from('agents')
    .insert({ name, type, description: description ?? null, org_id, config: {} })
    .select('id')
    .single()

  if (agentErr || !agent) {
    return NextResponse.json({ error: agentErr?.message }, { status: 500 })
  }

  // Générer la clé API
  const rawKey = generateApiKey()
  const keyHash = hashApiKey(rawKey)

  await admin.from('agent_api_keys').insert({
    agent_id: agent.id,
    org_id,
    key_hash: keyHash,
    label: 'default',
  })

  return NextResponse.json({ agent_id: agent.id, api_key: rawKey })
}
