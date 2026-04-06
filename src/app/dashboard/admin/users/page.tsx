import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CreateUserDialog } from '@/components/admin/create-user-dialog'

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

  // Récupérer tous les profils avec leur org
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, user_id, role, full_name, created_at, organizations(name, slug)')
    .order('created_at', { ascending: false })

  // Récupérer les emails depuis auth via admin
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

  const typedProfiles = (profiles ?? []) as unknown as Profile[]

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
          <CardTitle>Tous les utilisateurs ({typedProfiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Créé le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {typedProfiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Aucun utilisateur
                  </TableCell>
                </TableRow>
              ) : (
                typedProfiles.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{emailMap[p.user_id] ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.organizations?.name ?? '—'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.role === 'master' ? 'default' : 'secondary'}>
                        {p.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(p.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
