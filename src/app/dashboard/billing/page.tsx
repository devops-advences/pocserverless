import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PrintButton } from '@/components/print-button'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id, organizations(name)')
    .eq('user_id', user.id)
    .single() as { data: { role: string; org_id: string; organizations: { name: string } | null } | null }

  const { data: runs } = await supabase
    .from('agent_runs')
    .select('status, items_processed, tokens_used, cost_usd, started_at, agents(name, organizations(name))')
    .order('started_at', { ascending: false })

  interface Run {
    status: string
    items_processed: number
    tokens_used: number
    cost_usd: number
    started_at: string
    agents: { name: string; organizations: { name: string } | null } | null
  }

  const typedRuns = (runs ?? []) as unknown as Run[]
  const isMaster = profile?.role === 'master'

  // Group by month
  type MonthKey = string
  type OrgKey = string
  const byMonthOrg: Record<MonthKey, Record<OrgKey, { runs: number; items: number; tokens: number; cost: number; errors: number }>> = {}

  for (const r of typedRuns) {
    const month = r.started_at.slice(0, 7) // YYYY-MM
    const org = isMaster
      ? (r.agents?.organizations?.name ?? 'Sans organisation')
      : (profile?.organizations?.name ?? 'Mon organisation')

    if (!byMonthOrg[month]) byMonthOrg[month] = {}
    if (!byMonthOrg[month][org]) byMonthOrg[month][org] = { runs: 0, items: 0, tokens: 0, cost: 0, errors: 0 }

    byMonthOrg[month][org].runs++
    byMonthOrg[month][org].items += r.items_processed ?? 0
    byMonthOrg[month][org].tokens += r.tokens_used ?? 0
    byMonthOrg[month][org].cost += Number(r.cost_usd ?? 0)
    if (r.status === 'failed') byMonthOrg[month][org].errors++
  }

  const months = Object.keys(byMonthOrg).sort().reverse()

  function formatMonth(m: string) {
    const [year, month] = m.split('-')
    const names = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
    return `${names[parseInt(month) - 1]} ${year}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facturation</h1>
          <p className="text-muted-foreground">Consommation mensuelle par organisation</p>
        </div>
        <PrintButton />
      </div>

      {months.length === 0 ? (
        <Card>
          <CardContent className="text-center text-muted-foreground py-12">
            Aucune donnée disponible
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 print:space-y-4">
          {months.map(month => {
            const orgs = byMonthOrg[month]
            const monthTotal = Object.values(orgs).reduce(
              (acc, o) => ({
                runs: acc.runs + o.runs,
                items: acc.items + o.items,
                tokens: acc.tokens + o.tokens,
                cost: acc.cost + o.cost,
                errors: acc.errors + o.errors,
              }),
              { runs: 0, items: 0, tokens: 0, cost: 0, errors: 0 }
            )

            return (
              <Card key={month} className="print:break-inside-avoid">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle>{formatMonth(month)}</CardTitle>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span><strong className="text-foreground">{monthTotal.runs}</strong> runs</span>
                      <span><strong className="text-foreground">{monthTotal.items.toLocaleString('fr-FR')}</strong> items</span>
                      <span><strong className="text-foreground">{monthTotal.tokens.toLocaleString('fr-FR')}</strong> tokens</span>
                      {monthTotal.cost > 0 && (
                        <span><strong className="text-foreground">${monthTotal.cost.toFixed(4)}</strong></span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {Object.entries(orgs).map(([orgName, stats]) => (
                      <div key={orgName} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{orgName}</span>
                          {stats.errors > 0 && (
                            <Badge variant="destructive" className="text-xs">{stats.errors} erreur{stats.errors > 1 ? 's' : ''}</Badge>
                          )}
                        </div>
                        <div className="flex gap-6 text-sm">
                          <span className="text-muted-foreground">
                            <strong className="text-foreground">{stats.runs}</strong> runs
                          </span>
                          <span className="text-muted-foreground">
                            <strong className="text-foreground">{stats.items.toLocaleString('fr-FR')}</strong> items
                          </span>
                          <span className="text-muted-foreground">
                            <strong className="text-foreground">{stats.tokens.toLocaleString('fr-FR')}</strong> tokens
                          </span>
                          {stats.cost > 0 && (
                            <span className="font-medium">${stats.cost.toFixed(4)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <style>{`
        @media print {
          nav, header, aside, .print-hide { display: none !important; }
          body { font-size: 12px; }
        }
      `}</style>
    </div>
  )
}
