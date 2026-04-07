'use client'

import { Button } from '@/components/ui/button'

interface LogItem {
  date: string
  agent: string
  run_id: string
  external_id: string
  name: string
  status: string
  error: string
  details: string
}

export function LogsExport({ items }: { items: LogItem[] }) {
  async function handleExport() {
    const xlsx = await import('xlsx')
    const ws = xlsx.utils.json_to_sheet(items.map(i => ({
      'Date'        : i.date,
      'Agent'       : i.agent,
      'ID Produit'  : i.external_id,
      'Nom produit' : i.name,
      'Statut'      : i.status,
      'Erreur'      : i.error,
      'Détails'     : i.details,
      'Run ID'      : i.run_id,
    })))
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, 'Logs')
    xlsx.writeFile(wb, `vgl_logs_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={items.length === 0}>
      Export XLS ({items.length})
    </Button>
  )
}
