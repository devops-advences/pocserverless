import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LogsFilters } from '@/components/logs-filters'
import { LogsExport } from '@/components/logs-export'
import { Suspense } from 'react'

interface SearchParams { status?: string; agent?: string; from?: string; to?: string }

export default async function LogsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const filters = await searchParams

  const { data: agents } = await supabase
    .from('agents')
    .select('id, name')
    .order('name')

  // Requête items avec join runs + agents
  let query = supabase
    .from('agent_run_items')
    .select(`
      id, external_id, name, status, details, created_at,
      agent_runs!inner(
        id, started_at, agent_id,
        agents!inner(id, name)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(500)

  // Filtre statut
  if (filters.status === 'error') query = query.eq('status', 'error')
  else if (filters.status === 'warning') query = query.eq('status', 'warning')
  else if (filters.status === 'ok') query = query.eq('status', 'ok')

  // Filtre agent
  if (filters.agent) {
    query = query.eq('agent_runs.agent_id', filters.agent)
  }

  // Filtre dates
  if (filters.from) query = query.gte('created_at', `${filters.from}T00:00:00`)
  if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59`)

  const { data: rawItems } = await query

  interface ItemRow {
    id: string
    external_id: string | null
    name: string | null
    status: string
    details: Record<string, unknown> | null
    created_at: string
    agent_runs: {
      id: string
      started_at: string
      agent_id: string
      agents: { id: string; name: string }
    }
  }

  const items = (rawItems ?? []) as unknown as ItemRow[]

  // Prépare les données pour l'export XLS
  const exportData = items.map(item => ({
    date      : new Date(item.created_at).toLocaleString('fr-FR'),
    agent     : item.agent_runs?.agents?.name ?? '',
    run_id    : item.agent_runs?.id ?? '',
    external_id: item.external_id ?? '',
    name      : item.name ?? '',
    status    : item.status,
    error     : item.status === 'error' ? (item.details?.error as string ?? '') : '',
    details   : item.details ? JSON.stringify(item.details) : '',
  }))

  const errorsCount   = items.filter(i => i.status === 'error').length
  const warningsCount = items.filter(i => i.status === 'warning').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Logs</h1>
          <p className="text-muted-foreground">
            Détail de tous les items traités
            {errorsCount > 0 && <span className="text-red-500 ml-2 font-medium">· {errorsCount} erreur{errorsCount > 1 ? 's' : ''}</span>}
            {warningsCount > 0 && <span className="text-yellow-500 ml-2 font-medium">· {warningsCount} avertissement{warningsCount > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <LogsExport items={exportData} />
      </div>

      <Suspense>
        <LogsFilters agents={(agents ?? []) as { id: string; name: string }[]} />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {items.length} item{items.length > 1 ? 's' : ''}
            {filters.status === 'error' && ' — Erreurs uniquement'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun log pour ce filtre</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Agent</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Produit</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Détails</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">Statut</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">Run</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => {
                    const details = item.details ?? {}
                    const errorMsg = (details.error as string) ?? ''
                    const themes  = Array.isArray(details.themes) ? details.themes as string[] : []
                    const lieux   = Array.isArray(details.lieux)  ? details.lieux  as string[] : []
                    const hasError = item.status === 'error'
                    const dexUrl  = (details.url as string) ?? null

                    return (
                      <tr key={item.id} className={hasError ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(item.created_at).toLocaleString('fr-FR', {
                            day: '2-digit', month: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {item.agent_runs?.agents?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {dexUrl ? (
                              <a
                                href={dexUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium hover:underline text-primary"
                              >
                                {item.name ?? item.external_id ?? '—'}
                              </a>
                            ) : (
                              <span className="font-medium">{item.name ?? '—'}</span>
                            )}
                            {item.external_id && (
                              <span className="text-xs text-muted-foreground font-mono">#{item.external_id}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {hasError && errorMsg ? (
                            <span className="text-red-600 text-xs">{errorMsg}</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {themes.map((t: string) => (
                                <span key={t} className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs px-1.5 py-0.5 rounded">
                                  {t}
                                </span>
                              ))}
                              {lieux.map((l: string) => (
                                <span key={l} className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 text-xs px-1.5 py-0.5 rounded">
                                  {l}
                                </span>
                              ))}
                              {themes.length === 0 && lieux.length === 0 && !errorMsg && (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={
                            item.status === 'ok'      ? 'default' :
                            item.status === 'error'   ? 'destructive' : 'secondary'
                          } className="text-xs">
                            {item.status === 'ok' ? '✅' : item.status === 'error' ? '❌' : '⚠️'} {item.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {item.agent_runs && (
                            <Link
                              href={`/dashboard/agents/${item.agent_runs.agents?.id}/runs/${item.agent_runs.id}`}
                              className="text-xs text-muted-foreground hover:text-foreground underline"
                            >
                              Voir run
                            </Link>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t px-4 py-3 text-xs text-muted-foreground flex gap-4">
            <span>✅ Traité avec succès</span>
            <span>⚠️ Avertissement</span>
            <span>❌ Erreur — ligne en rouge</span>
            <span className="ml-auto">Cliquer sur le nom du produit → ouvre dans DEX (si URL fournie par l&apos;agent)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
