import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default async function RunsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: runs } = await supabase
    .from('agent_runs')
    .select('id, status, items_processed, tokens_used, started_at, ended_at, metadata, agents(id, name)')
    .order('started_at', { ascending: false })
    .limit(100)

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

      <Card>
        <CardHeader>
          <CardTitle>Tous les runs ({typedRuns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {typedRuns.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune exécution pour le moment</p>
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
                  const duration = meta.duration_min != null ? `${meta.duration_min} min` : '—'
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
                      <TableCell>{run.items_processed.toLocaleString('fr-FR')}</TableCell>
                      <TableCell>{run.tokens_used.toLocaleString('fr-FR')}</TableCell>
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
