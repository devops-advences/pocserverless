import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>
}) {
  const { id, runId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: run }, { data: agent }, { data: items }] = await Promise.all([
    supabase
      .from('agent_runs')
      .select('*')
      .eq('id', runId)
      .single(),
    supabase
      .from('agents')
      .select('id, name')
      .eq('id', id)
      .single(),
    supabase
      .from('agent_run_items')
      .select('*')
      .eq('run_id', runId)
      .order('created_at'),
  ])

  if (!run || !agent) notFound()

  const meta = (run.metadata ?? {}) as Record<string, unknown>

  // Construire les stats résumé
  const summaryStats: { label: string; value: string | number; color?: string }[] = []
  if (meta.prive_count != null) summaryStats.push({ label: 'Privé', value: Number(meta.prive_count) })
  if (meta.st_ok_count != null) summaryStats.push({ label: 'ST OK', value: Number(meta.st_ok_count), color: 'text-green-600' })
  if (meta.st_ko_count != null) summaryStats.push({ label: 'ST KO', value: Number(meta.st_ko_count), color: 'text-red-600' })
  if (meta.produits_orphelins != null) summaryStats.push({ label: 'Orphelins trouvés', value: Number(meta.produits_orphelins) })
  if (meta.avec_themes != null) summaryStats.push({ label: '✅ Avec thème(s)', value: Number(meta.avec_themes), color: 'text-green-600' })
  if (meta.non_classifie != null) summaryStats.push({ label: '⚠️ Non classifié', value: Number(meta.non_classifie), color: 'text-yellow-600' })
  if (meta.localites_inserees != null) summaryStats.push({ label: 'Localités insérées', value: Number(meta.localites_inserees) })
  if (meta.erreurs != null) summaryStats.push({ label: '❌ Erreurs', value: Number(meta.erreurs), color: Number(meta.erreurs) > 0 ? 'text-red-600' : undefined })
  if (meta.batches_ia != null) summaryStats.push({ label: 'Batches IA', value: Number(meta.batches_ia) })
  if (meta.duration_min != null) summaryStats.push({ label: 'Durée', value: `${meta.duration_min} min` })

  interface RunItem {
    id: string
    external_id: string | null
    name: string | null
    status: string
    data: {
      themes?: string[]
      lieux?: string[]
      [key: string]: unknown
    }
  }

  const typedItems = (items ?? []) as unknown as RunItem[]

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/agents" className="hover:text-foreground">Agents</Link>
        <span>/</span>
        <Link href={`/dashboard/agents/${id}`} className="hover:text-foreground">{agent.name}</Link>
        <span>/</span>
        <span>Run du {new Date(run.started_at).toLocaleDateString('fr-FR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })}</span>
      </div>

      {/* Header run */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{agent.name}</h1>
        <Badge variant={run.status === 'completed' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}>
          {run.status}
        </Badge>
      </div>

      {/* Résumé du run */}
      {summaryStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Résumé du run</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xl font-bold">{run.items_processed}</p>
                <p className="text-xs text-muted-foreground">Produits traités</p>
              </div>
              {summaryStats.map(stat => (
                <div key={stat.label} className="bg-muted rounded-lg p-3 text-center">
                  <p className={`text-xl font-bold ${stat.color ?? ''}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tableau détail produits */}
      {typedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Détail des produits traités ({typedItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">ID</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nom produit</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Thèmes attribués</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lieux</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-24">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {typedItems.map((item, i) => {
                    const themes = item.data?.themes ?? []
                    const lieux = item.data?.lieux ?? []
                    return (
                      <tr key={item.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {item.external_id ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-medium">{item.name ?? '—'}</td>
                        <td className="px-4 py-3">
                          {themes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {themes.map((t: string) => (
                                <span key={t} className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs px-1.5 py-0.5 rounded">
                                  {t}
                                </span>
                              ))}
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {lieux.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {lieux.map((l: string) => (
                                <span key={l} className="text-xs text-muted-foreground">
                                  {l}
                                </span>
                              ))}
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={
                            item.status === 'ok' ? 'text-green-600' :
                            item.status === 'warning' ? 'text-yellow-600' :
                            'text-red-600'
                          }>
                            {item.status === 'ok' ? '✅' : item.status === 'warning' ? '⚠️' : '❌'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Légende */}
            <div className="border-t px-4 py-3 text-xs text-muted-foreground flex gap-4">
              <span>✅ Traité avec succès</span>
              <span>⚠️ Non classifié</span>
              <span>❌ Erreur technique</span>
            </div>
          </CardContent>
        </Card>
      )}

      {run.error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive text-sm">Erreur</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="text-sm text-destructive">{run.error}</code>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
