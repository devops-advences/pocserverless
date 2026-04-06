'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Org { id: string; name: string; slug: string }

export function CreateUserDialog({ organizations }: { organizations: Org[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    email: '', full_name: '', password: '', org_id: '', role: 'manager'
  })

  async function handleCreate() {
    if (!form.email || !form.org_id || !form.password) return
    setLoading(true)

    const res = await fetch('/api/admin/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Erreur création utilisateur')
    } else {
      toast.success(`Utilisateur ${form.email} créé`)
      setForm({ email: '', full_name: '', password: '', org_id: '', role: 'manager' })
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Nouvel utilisateur</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un utilisateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Organisation</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.org_id}
                onChange={e => setForm(f => ({ ...f, org_id: e.target.value }))}
              >
                <option value="">Sélectionner...</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="contact@client.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nom complet</Label>
              <Input
                placeholder="Prénom Nom"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mot de passe temporaire</Label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button
              onClick={handleCreate}
              disabled={loading || !form.email || !form.org_id || !form.password}
            >
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
