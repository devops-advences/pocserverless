'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Org {
  id: string
  name: string
  slug: string
  created_at: string
  profiles: { count: number }[]
}

export function ClientsTable({ organizations }: { organizations: Org[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [editOrg, setEditOrg] = useState<Org | null>(null)
  const [deleteOrg, setDeleteOrg] = useState<Org | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEdit() {
    if (!editOrg) return
    setLoading(true)
    const { error } = await supabase
      .from('organizations')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', editOrg.id)
    if (error) {
      toast.error('Erreur lors de la mise à jour')
    } else {
      toast.success('Organisation mise à jour')
      setEditOrg(null)
      router.refresh()
    }
    setLoading(false)
  }

  async function handleDelete() {
    if (!deleteOrg) return
    setLoading(true)
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', deleteOrg.id)
    if (error) {
      toast.error('Erreur lors de la suppression')
    } else {
      toast.success('Organisation supprimée')
      setDeleteOrg(null)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Utilisateurs</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Aucun client
                </TableCell>
              </TableRow>
            ) : (
              organizations.map(org => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{org.slug}</Badge>
                  </TableCell>
                  <TableCell>{org.profiles?.[0]?.count ?? 0}</TableCell>
                  <TableCell>{new Date(org.created_at).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setEditOrg(org); setName(org.name) }}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteOrg(org)}
                    >
                      Supprimer
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editOrg} onOpenChange={() => setEditOrg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOrg(null)}>Annuler</Button>
            <Button onClick={handleEdit} disabled={loading}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteOrg} onOpenChange={() => setDeleteOrg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer {deleteOrg?.name} ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible. Tous les agents et données associés seront supprimés.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOrg(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
