import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AutoRefresh } from '@/components/auto-refresh'

export default async function AgentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: agents } = await supabase
    .from('agents')
    .select(`
      id, name, type, description, is_active,
      agent_runs(
        id, status, items_processed, tokens_used, cost_usd, started_at, ended_at, metadata
      )
    `)
    .order('created_at', { ascending: false })

  interface Run {
    id: string
    status: string
    items_processed: number
    tokens_used: number
    cost_usd: number
    started_at: string
    ended_at: string | null
    metadata: Record<string, unknown>
  }

  interface Agent {
    id: string
    name: string
    type: string
    description: string | null
    is_active: boolean
    agent_runs: Run[]
  }

  const typedAgents = (agents ?? []) as unknown as Agent[]

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={30000} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mes agents IA</h1>
        <p className="text-muted-foreground">Activité et historique de vos agents</p>
      </div>

      {typedAgents.length === 0 ? (
        <Card>
          <CardContent className="text-center text-muted-foreground py-12">
            Aucun agent configuré pour votre organisation.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {typedAgents.map(agent => {
            const runs = agent.agent_runs ?? []
            const lastRun = runs.sort((a, b) =>
              new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
            )[0]
            const totalItems = runs.reduce((s, r) => s + (r.items_processed ?? 0), 0)
            const totalTokens = runs.reduce((s, r) => s + (r.tokens_used ?? 0), 0)

            // Badge dernière activité
            let activityBadge = { label: 'Aucune activité', variant: 'secondary' as const }
            if (lastRun) {
              const minutesAgo = (Date.now() - new Date(lastRun.started_at).getTime()) / 60000
              if (minutesAgo < 60) {
                activityBadge = { label: `Il y a ${Math.round(minutesAgo)} min`, variant: 'default' as const }
              } else if (minutesAgo < 60 * 24) {
                activityBadge = { label: `Il y a ${Math.round(minutesAgo / 60)}h`, variant: 'default' as const }
              } else {
                const days = Math.round(minutesAgo / 60 / 24)
                activityBadge = { label: `Il y a ${days}j`, variant: 'secondary' as const }
              }
            }

            return (
              <Link key={agent.id} href={`/dashboard/agents/${agent.id}`}>
                <Card className="hover:border-foreground/30 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{agent.name}</CardTitle>
                        {agent.description && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {agent.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                          {agent.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                        <Badge variant={activityBadge.variant} className="text-xs font-normal">
                          {activityBadge.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted rounded-lg p-2">
                        <p className="text-lg font-bold">{runs.length}</p>
                        <p className="text-xs text-muted-foreground">Runs</p>
                      </div>
                      <div className="bg-muted rounded-lg p-2">
                        <p className="text-lg font-bold">{totalItems.toLocaleString('fr-FR')}</p>
                        <p className="text-xs text-muted-foreground">Items traités</p>
                      </div>
                      <div className="bg-muted rounded-lg p-2">
                        <p className="text-lg font-bold">{totalTokens.toLocaleString('fr-FR')}</p>
                        <p className="text-xs text-muted-foreground">Tokens</p>
                      </div>
                    </div>

                    {/* Dernier run */}
                    {lastRun && (
                      <div className="flex items-center justify-between text-sm border-t pt-3">
                        <span className="text-muted-foreground">Dernier run</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {new Date(lastRun.started_at).toLocaleDateString('fr-FR', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                          <Badge
                            variant={
                              lastRun.status === 'completed' ? 'default' :
                              lastRun.status === 'failed' ? 'destructive' : 'secondary'
                            }
                            className="text-xs"
                          >
                            {lastRun.status}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
