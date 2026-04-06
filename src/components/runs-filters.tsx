'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'

interface Agent { id: string; name: string }

export function RunsFilters({ agents }: { agents: Agent[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const set = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Statut</label>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background h-9"
          value={searchParams.get('status') ?? ''}
          onChange={e => set('status', e.target.value)}
        >
          <option value="">Tous les statuts</option>
          <option value="completed">Succès</option>
          <option value="failed">Échec</option>
          <option value="running">En cours</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Agent</label>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background h-9"
          value={searchParams.get('agent') ?? ''}
          onChange={e => set('agent', e.target.value)}
        >
          <option value="">Tous les agents</option>
          {agents.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Du</label>
        <Input
          type="date"
          className="h-9 text-sm w-36"
          value={searchParams.get('from') ?? ''}
          onChange={e => set('from', e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Au</label>
        <Input
          type="date"
          className="h-9 text-sm w-36"
          value={searchParams.get('to') ?? ''}
          onChange={e => set('to', e.target.value)}
        />
      </div>

      {(searchParams.get('status') || searchParams.get('agent') || searchParams.get('from') || searchParams.get('to')) && (
        <button
          className="text-xs text-muted-foreground hover:text-foreground underline self-end pb-2"
          onClick={() => router.push(pathname)}
        >
          Réinitialiser
        </button>
      )}
    </div>
  )
}
