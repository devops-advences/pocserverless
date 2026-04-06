import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashApiKey } from '@/lib/hash'

export const runtime = 'nodejs'

interface IngestPayload {
  metrics: {
    items_processed?: number
    tokens_used?: number
    cost_usd?: number
    duration_min?: number
    [key: string]: unknown
  }
  items?: Array<{
    external_id?: string
    name?: string
    status?: 'ok' | 'warning' | 'error'
    data?: Record<string, unknown>
  }>
  status?: 'completed' | 'failed'
  error?: string
}

export async function POST(request: Request) {
  // 1. Vérifier l'API key
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 })
  }

  const rawKey = authHeader.slice(7)
  const keyHash = hashApiKey(rawKey)
  const supabase = createAdminClient()

  // 2. Trouver la clé et l'agent associé
  const { data: apiKey, error: keyError } = await supabase
    .from('agent_api_keys')
    .select('id, agent_id, org_id')
    .eq('key_hash', keyHash)
    .single()

  if (keyError || !apiKey) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  // 3. Parser le payload
  let payload: IngestPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    metrics = {},
    items = [],
    status = 'completed',
    error: runError,
  } = payload

  const {
    items_processed = items.length,
    tokens_used = 0,
    cost_usd = 0,
    duration_min,
    ...customMetrics
  } = metrics

  // 4. Créer le agent_run
  const { data: run, error: runErr } = await supabase
    .from('agent_runs')
    .insert({
      agent_id: apiKey.agent_id,
      org_id: apiKey.org_id,
      status,
      ended_at: new Date().toISOString(),
      items_processed,
      tokens_used,
      cost_usd,
      error: runError ?? null,
      metadata: {
        duration_min: duration_min ?? null,
        ...customMetrics,
      },
    })
    .select('id')
    .single()

  if (runErr || !run) {
    console.error('Run insert error:', runErr)
    return NextResponse.json({ error: 'Failed to create run' }, { status: 500 })
  }

  // 5. Insérer les items détaillés
  if (items.length > 0) {
    const runItems = items.map(item => ({
      run_id: run.id,
      org_id: apiKey.org_id,
      external_id: item.external_id ?? null,
      name: item.name ?? null,
      status: item.status ?? 'ok',
      data: item.data ?? {},
    }))

    const { error: itemsErr } = await supabase
      .from('agent_run_items')
      .insert(runItems)

    if (itemsErr) {
      console.error('Items insert error:', itemsErr)
    }
  }

  // 6. Mettre à jour last_used_at de la clé
  await supabase
    .from('agent_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id)

  return NextResponse.json({
    success: true,
    run_id: run.id,
    items_saved: items.length,
  })
}
