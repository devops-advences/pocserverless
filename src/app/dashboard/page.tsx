import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ count: agentsCount }, { count: runsCount }] = await Promise.all([
    supabase.from('agents').select('*', { count: 'exact', head: true }),
    supabase.from('agent_runs').select('*', { count: 'exact', head: true }),
  ])

  interface RunWithAgent {
    id: string
    status: string
    items_processed: number
    tokens_used: number
    created_at: string
    agents: { name: string; type: string } | null
  }

  const { data: recentRuns } = await supabase
    .from('agent_runs')
    .select('id, status, items_processed, tokens_used, created_at, agents(name, type)')
    .order('created_at', { ascending: false })
    .limit(5) as { data: RunWithAgent[] | null }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Vue d&apos;ensemble de vos agents IA</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Agents actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentsCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Exécutions totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runsCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tokens utilisés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Coût estimé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exécutions récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentRuns?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune exécution pour le moment
            </p>
          ) : (
            <div className="space-y-2">
              {recentRuns.map(run => (
                <div key={run.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{run.agents?.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(run.created_at).toLocaleString('fr-FR')}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{run.items_processed} items</span>
                    <span className="text-muted-foreground">{run.tokens_used} tokens</span>
                    <Badge variant={run.status === 'completed' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}>
                      {run.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
