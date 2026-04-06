import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, type, description, is_active')
    .eq('id', id)
    .single()

  if (!agent) notFound()

  const { data: runs } = await supabase
    .from('agent_runs')
    .select('id, status, items_processed, tokens_used, cost_usd, started_at, ended_at, metadata, error')
    .eq('agent_id', id)
    .order('started_at', { ascending: false })
    .limit(50)

  interface Run {
    id: string
    status: string
    items_processed: number
    tokens_used: number
    cost_usd: number
    started_at: string
    ended_at: string | null
    metadata: Record<string, unknown>
    error: string | null
  }

  const typedRuns = (runs ?? []) as unknown as Run[]
  const totalItems = typedRuns.reduce((s, r) => s + r.items_processed, 0)
  const totalTokens = typedRuns.reduce((s, r) => s + r.tokens_used, 0)
  const successRate = typedRuns.length
    ? Math.round((typedRuns.filter(r => r.status === 'completed').length / typedRuns.length) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/agents" className="text-sm text-muted-foreground hover:text-foreground">
              ← Agents
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
          {agent.description && (
            <p className="text-muted-foreground text-sm mt-1">{agent.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{agent.type}</Badge>
            <Badge variant={agent.is_active ? 'default' : 'secondary'}>
              {agent.is_active ? 'Actif' : 'Inactif'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Runs totaux</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{typedRuns.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Items traités</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalItems.toLocaleString('fr-FR')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tokens utilisés</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalTokens.toLocaleString('fr-FR')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taux de succès</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{successRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Historique des runs */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des runs</CardTitle>
        </CardHeader>
        <CardContent>
          {typedRuns.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun run pour le moment</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Items traités</TableHead>
                  <TableHead>Métriques clés</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typedRuns.map(run => {
                  const meta = run.metadata ?? {}
                  const duration = meta.duration_min != null ? `${meta.duration_min} min` : '—'

                  // Métriques spécifiques selon le type d'agent
                  const keyMetrics: string[] = []
                  if (meta.st_ok_count != null) keyMetrics.push(`ST OK: ${meta.st_ok_count}`)
                  if (meta.st_ko_count != null) keyMetrics.push(`KO: ${meta.st_ko_count}`)
                  if (meta.prive_count != null) keyMetrics.push(`Privé: ${meta.prive_count}`)
                  if (meta.avec_themes != null) keyMetrics.push(`Thèmes: ${meta.avec_themes}`)
                  if (meta.localites_inserees != null) keyMetrics.push(`Lieux: ${meta.localites_inserees}`)
                  if (meta.non_classifie != null && Number(meta.non_classifie) > 0)
                    keyMetrics.push(`⚠️ Non classifié: ${meta.non_classifie}`)
                  if (meta.erreurs != null && Number(meta.erreurs) > 0)
                    keyMetrics.push(`❌ Erreurs: ${meta.erreurs}`)

                  return (
                    <TableRow key={run.id}>
                      <TableCell className="text-sm">
                        {new Date(run.started_at).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          run.status === 'completed' ? 'default' :
                          run.status === 'failed' ? 'destructive' : 'secondary'
                        }>
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {run.items_processed.toLocaleString('fr-FR')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {keyMetrics.length > 0 ? keyMetrics.join(' | ') : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{duration}</TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/agents/${id}/runs/${run.id}`}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Détail →
                        </Link>
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
