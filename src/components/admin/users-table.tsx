'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Org { id: string; name: string; slug: string }
interface UserRow {
  id: string
  user_id: string
  role: string
  full_name: string | null
  created_at: string
  email: string
  organizations: { name: string; slug: string } | null
}

export function UsersTable({ users, organizations }: { users: UserRow[]; organizations: Org[] }) {
  const router = useRouter()
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', password: '', role: '', org_id: '' })

  function openEdit(u: UserRow) {
    setEditUser(u)
    setForm({ email: u.email, full_name: u.full_name ?? '', password: '', role: u.role, org_id: '' })
  }

  async function handleUpdate() {
    if (!editUser) return
    setLoading(true)

    const payload: Record<string, string> = { user_id: editUser.user_id }
    if (form.email && form.email !== editUser.email) payload.email = form.email
    if (form.full_name !== editUser.full_name) payload.full_name = form.full_name
    if (form.password) payload.password = form.password
    if (form.role && form.role !== editUser.role) payload.role = form.role
    if (form.org_id) payload.org_id = form.org_id

    const res = await fetch('/api/admin/users/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Erreur mise à jour')
    } else {
      toast.success('Utilisateur mis à jour')
      setEditUser(null)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Organisation</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>Créé le</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Aucun utilisateur
              </TableCell>
            </TableRow>
          ) : (
            users.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">{u.organizations?.name ?? '—'}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.role === 'master' ? 'default' : 'secondary'}>
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(u.created_at).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                    Modifier
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Dialog edit */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier {editUser?.full_name ?? editUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nom complet</Label>
              <Input
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nouveau mot de passe <span className="text-muted-foreground">(laisser vide = inchangé)</span></Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rôle</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              >
                <option value="manager">Manager</option>
                <option value="master">Master</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Changer d&apos;organisation <span className="text-muted-foreground">(optionnel)</span></Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.org_id}
                onChange={e => setForm(f => ({ ...f, org_id: e.target.value }))}
              >
                <option value="">— Garder l&apos;organisation actuelle —</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Annuler</Button>
            <Button onClick={handleUpdate} disabled={loading}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
