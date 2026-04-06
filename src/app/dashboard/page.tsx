import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RunsAreaChart, AgentBarChart } from '@/components/charts/runs-chart'
import { AutoRefresh } from '@/components/auto-refresh'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ count: agentsCount }, { count: runsCount }] = await Promise.all([
    supabase.from('agents').select('*', { count: 'exact', head: true }),
    supabase.from('agent_runs').select('*', { count: 'exact', head: true }),
  ])

  // 30-day run data for area chart
  const since30 = new Date()
  since30.setDate(since30.getDate() - 29)
  const since30Str = since30.toISOString()

  interface RunRow { created_at: string; items_processed: number; status: string }
  const { data: runsRaw } = await supabase
    .from('agent_runs')
    .select('created_at, items_processed, status')
    .gte('created_at', since30Str) as { data: RunRow[] | null }

  // Group by date
  const dayMap: Record<string, { runs: number; items: number; errors: number }> = {}
  for (let i = 0; i < 30; i++) {
    const d = new Date(since30)
    d.setDate(d.getDate() + i)
    dayMap[d.toISOString().slice(0, 10)] = { runs: 0, items: 0, errors: 0 }
  }
  for (const r of runsRaw ?? []) {
    const day = r.created_at.slice(0, 10)
    if (dayMap[day]) {
      dayMap[day].runs++
      dayMap[day].items += r.items_processed ?? 0
      if (r.status === 'failed') dayMap[day].errors++
    }
  }
  const chartData = Object.entries(dayMap).map(([date, v]) => ({
    date: date.slice(5), // MM-DD
    ...v,
  }))

  // Per-agent stats for bar chart
  interface AgentRunRow { items_processed: number; status: string; agents: { name: string } | null }
  const { data: agentRuns } = await supabase
    .from('agent_runs')
    .select('items_processed, status, agents(name)') as { data: AgentRunRow[] | null }

  const agentMap: Record<string, { items: number; runs: number; errors: number }> = {}
  for (const r of agentRuns ?? []) {
    const name = r.agents?.name ?? 'Inconnu'
    if (!agentMap[name]) agentMap[name] = { items: 0, runs: 0, errors: 0 }
    agentMap[name].runs++
    agentMap[name].items += r.items_processed ?? 0
    if (r.status === 'failed') agentMap[name].errors++
  }
  const barData = Object.entries(agentMap).map(([name, v]) => ({ name, ...v }))

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

  const totalTokens = (agentRuns ?? []).reduce((s, r) => s + ((r as unknown as { tokens_used?: number }).tokens_used ?? 0), 0)

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={30000} />
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
            <div className="text-2xl font-bold">{totalTokens.toLocaleString('fr-FR')}</div>
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Activité sur 30 jours</CardTitle>
          </CardHeader>
          <CardContent>
            <RunsAreaChart data={chartData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Performance par agent</CardTitle>
          </CardHeader>
          <CardContent>
            <AgentBarChart data={barData} />
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
