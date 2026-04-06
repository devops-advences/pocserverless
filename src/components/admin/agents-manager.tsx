'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Org { id: string; name: string; slug: string }
interface Agent {
  id: string
  name: string
  type: string
  description: string | null
  is_active: boolean
  created_at: string
  organizations: { name: string } | null
  agent_api_keys: { id: string; label: string; last_used_at: string | null; created_at: string }[]
}

export function AgentsManager({ organizations, agents }: { organizations: Org[]; agents: Agent[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newKey, setNewKey] = useState<{ agent_name: string; api_key: string } | null>(null)
  const [form, setForm] = useState({ name: '', type: 'cron_cfm_dust', description: '', org_id: '' })

  async function handleCreate() {
    if (!form.name || !form.org_id) return
    setLoading(true)

    const res = await fetch('/api/agents/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error ?? 'Erreur création agent')
    } else {
      setNewKey({ agent_name: form.name, api_key: data.api_key })
      setOpen(false)
      setForm({ name: '', type: 'cron_cfm_dust', description: '', org_id: '' })
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>+ Nouvel agent</Button>
      </div>

      {/* Clé API générée — à copier une seule fois */}
      {newKey && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-300 text-base">
              Clé API générée pour "{newKey.agent_name}"
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              ⚠️ Copiez cette clé maintenant — elle ne sera plus affichée.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-background rounded px-3 py-2 text-sm font-mono border break-all">
                {newKey.api_key}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(newKey.api_key)
                  toast.success('Clé copiée')
                }}
              >
                Copier
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setNewKey(null)}>
              J&apos;ai copié la clé ✓
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Liste des agents */}
      <div className="space-y-3">
        {agents.length === 0 ? (
          <Card>
            <CardContent className="text-center text-muted-foreground py-10">
              Aucun agent créé
            </CardContent>
          </Card>
        ) : (
          agents.map(agent => (
            <Card key={agent.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{agent.name}</span>
                      <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                        {agent.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                      <Badge variant="outline">{agent.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Client : {agent.organizations?.name ?? '—'}
                    </p>
                    {agent.description && (
                      <p className="text-sm text-muted-foreground">{agent.description}</p>
                    )}
                  </div>
                </div>

                {/* Clés API */}
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Clés API ({agent.agent_api_keys.length})</p>
                  {agent.agent_api_keys.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucune clé</p>
                  ) : (
                    <div className="space-y-1">
                      {agent.agent_api_keys.map(key => (
                        <div key={key.id} className="flex items-center gap-3 text-xs">
                          <code className="bg-muted px-2 py-0.5 rounded">poc_live_••••••••</code>
                          <span className="text-muted-foreground">
                            Créée le {new Date(key.created_at).toLocaleDateString('fr-FR')}
                          </span>
                          {key.last_used_at && (
                            <span className="text-muted-foreground">
                              · Dernier appel {new Date(key.last_used_at).toLocaleString('fr-FR')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Exemple webhook */}
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Endpoint webhook</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded block">
                    POST {process.env.NEXT_PUBLIC_APP_URL ?? 'https://pocserverless.advences.io'}/api/agent-runs/ingest
                  </code>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog création */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Client (organisation)</Label>
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
              <Label>Nom de l&apos;agent</Label>
              <Input
                placeholder="ex: Qualification Transferts"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                <option value="cron_cfm_dust">Cron CFM + Dust</option>
                <option value="cron_cfm">Cron CFM</option>
                <option value="dust">Dust IA</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Description (optionnel)</Label>
              <Input
                placeholder="Description courte"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={loading || !form.name || !form.org_id}>
              Créer et générer la clé API
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
