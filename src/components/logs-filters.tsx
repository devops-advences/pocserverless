'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

interface Agent { id: string; name: string }

export function LogsFilters({ agents }: { agents: Agent[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const set = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const hasFilters = searchParams.get('status') || searchParams.get('agent') || searchParams.get('from') || searchParams.get('to')

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Statut</label>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background h-9"
          value={searchParams.get('status') ?? ''}
          onChange={e => set('status', e.target.value)}
        >
          <option value="">Tous</option>
          <option value="error">❌ Erreurs uniquement</option>
          <option value="warning">⚠️ Avertissements</option>
          <option value="ok">✅ Succès</option>
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
        <input
          type="date"
          className="border rounded-md px-3 py-2 text-sm bg-background h-9 w-36"
          value={searchParams.get('from') ?? ''}
          onChange={e => set('from', e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Au</label>
        <input
          type="date"
          className="border rounded-md px-3 py-2 text-sm bg-background h-9 w-36"
          value={searchParams.get('to') ?? ''}
          onChange={e => set('to', e.target.value)}
        />
      </div>

      {hasFilters && (
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
