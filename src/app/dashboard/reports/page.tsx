import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: runs } = await supabase
    .from('agent_runs')
    .select('status, items_processed, tokens_used, cost_usd, started_at, metadata, agents(name)')

  interface Run {
    status: string
    items_processed: number
    tokens_used: number
    cost_usd: number
    started_at: string
    metadata: Record<string, unknown>
    agents: { name: string } | null
  }

  const typedRuns = (runs ?? []) as unknown as Run[]

  const totalRuns = typedRuns.length
  const totalItems = typedRuns.reduce((s, r) => s + r.items_processed, 0)
  const totalTokens = typedRuns.reduce((s, r) => s + r.tokens_used, 0)
  const totalCost = typedRuns.reduce((s, r) => s + Number(r.cost_usd), 0)
  const successRate = totalRuns
    ? Math.round((typedRuns.filter(r => r.status === 'completed').length / totalRuns) * 100)
    : 0

  // Stats par agent
  const byAgent: Record<string, { runs: number; items: number; tokens: number }> = {}
  typedRuns.forEach(run => {
    const name = run.agents?.name ?? 'Inconnu'
    if (!byAgent[name]) byAgent[name] = { runs: 0, items: 0, tokens: 0 }
    byAgent[name].runs++
    byAgent[name].items += run.items_processed
    byAgent[name].tokens += run.tokens_used
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rapports</h1>
        <p className="text-muted-foreground">Synthèse globale de l&apos;activité</p>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Runs totaux', value: totalRuns },
          { label: 'Items traités', value: totalItems.toLocaleString('fr-FR') },
          { label: 'Tokens utilisés', value: totalTokens.toLocaleString('fr-FR') },
          { label: 'Coût estimé', value: `$${totalCost.toFixed(4)}` },
          { label: 'Taux de succès', value: `${successRate}%` },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Par agent */}
      <Card>
        <CardHeader>
          <CardTitle>Par agent</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(byAgent).length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(byAgent).map(([name, stats]) => (
                <div key={name} className="flex items-center justify-between py-3 border-b last:border-0">
                  <span className="font-medium">{name}</span>
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <span><strong className="text-foreground">{stats.runs}</strong> runs</span>
                    <span><strong className="text-foreground">{stats.items.toLocaleString('fr-FR')}</strong> items</span>
                    <span><strong className="text-foreground">{stats.tokens.toLocaleString('fr-FR')}</strong> tokens</span>
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
