import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClientsTable } from '@/components/admin/clients-table'
import { CreateClientDialog } from '@/components/admin/create-client-dialog'

export default async function AdminClientsPage() {
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
    .select('*, profiles(count)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">Gérez les organisations clientes</p>
        </div>
        <CreateClientDialog />
      </div>
      <ClientsTable organizations={organizations ?? []} />
    </div>
  )
}
