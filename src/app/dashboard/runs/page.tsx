import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RunsFilters } from '@/components/runs-filters'
import { Suspense } from 'react'

interface SearchParams { status?: string; agent?: string; from?: string; to?: string }

export default async function RunsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const filters = await searchParams

  const { data: agents } = await supabase
    .from('agents')
    .select('id, name')
    .order('name')

  let query = supabase
    .from('agent_runs')
    .select('id, status, items_processed, tokens_used, started_at, ended_at, metadata, agents(id, name)')
    .order('started_at', { ascending: false })
    .limit(200)

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.agent) query = query.eq('agent_id', filters.agent)
  if (filters.from) query = query.gte('started_at', `${filters.from}T00:00:00`)
  if (filters.to) query = query.lte('started_at', `${filters.to}T23:59:59`)

  const { data: runs } = await query

  interface Run {
    id: string
    status: string
    items_processed: number
    tokens_used: number
    started_at: string
    ended_at: string | null
    metadata: Record<string, unknown>
    agents: { id: string; name: string } | null
  }

  const typedRuns = (runs ?? []) as unknown as Run[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Exécutions</h1>
        <p className="text-muted-foreground">Historique de tous les runs</p>
      </div>

      <Suspense>
        <RunsFilters agents={(agents ?? []) as { id: string; name: string }[]} />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>Runs ({typedRuns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {typedRuns.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune exécution pour ce filtre</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Items traités</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typedRuns.map(run => {
                  const meta = run.metadata ?? {}
                  const duration = (meta as Record<string, unknown>).duration_min != null
                    ? `${(meta as Record<string, unknown>).duration_min} min`
                    : '—'
                  return (
                    <TableRow key={run.id}>
                      <TableCell className="text-sm">
                        {new Date(run.started_at).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="font-medium">{run.agents?.name ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          run.status === 'completed' ? 'default' :
                          run.status === 'failed' ? 'destructive' : 'secondary'
                        }>
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{(run.items_processed ?? 0).toLocaleString('fr-FR')}</TableCell>
                      <TableCell>{(run.tokens_used ?? 0).toLocaleString('fr-FR')}</TableCell>
                      <TableCell className="text-muted-foreground">{duration}</TableCell>
                      <TableCell>
                        {run.agents && (
                          <Link
                            href={`/dashboard/agents/${run.agents.id}/runs/${run.id}`}
                            className="text-sm text-muted-foreground hover:text-foreground"
                          >
                            Détail →
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
