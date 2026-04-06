import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateUserDialog } from '@/components/admin/create-user-dialog'
import { UsersTable } from '@/components/admin/users-table'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single() as { data: { role: string } | null }

  if (profile?.role !== 'master') redirect('/dashboard')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, user_id, role, full_name, created_at, organizations(name, slug)')
    .order('created_at', { ascending: false })

  const admin = createAdminClient()
  const { data: authUsers } = await admin.auth.admin.listUsers()

  const emailMap: Record<string, string> = {}
  authUsers?.users?.forEach(u => { emailMap[u.id] = u.email ?? '' })

  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .order('name')

  interface Profile {
    id: string
    user_id: string
    role: string
    full_name: string | null
    created_at: string
    organizations: { name: string; slug: string } | null
  }

  const usersWithEmail = ((profiles ?? []) as unknown as Profile[]).map(p => ({
    ...p,
    email: emailMap[p.user_id] ?? '',
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utilisateurs</h1>
          <p className="text-muted-foreground">Gérez les accès par organisation</p>
        </div>
        <CreateUserDialog organizations={organizations ?? []} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tous les utilisateurs ({usersWithEmail.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable users={usersWithEmail} organizations={organizations ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
