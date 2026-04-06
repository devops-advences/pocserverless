import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AgentsManager } from '@/components/admin/agents-manager'

export default async function AdminAgentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single() as { data: { role: string } | null }

  if (profile?.role !== 'master') redirect('/dashboard')

  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .order('name')

  const { data: agents } = await supabase
    .from('agents')
    .select('*, organizations(name), agent_api_keys(id, label, last_used_at, created_at)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agents IA</h1>
        <p className="text-muted-foreground">Gérez les agents et leurs clés API</p>
      </div>
      <AgentsManager
        organizations={organizations ?? []}
        agents={agents ?? []}
      />
    </div>
  )
}
