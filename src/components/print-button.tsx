'use client'

import { Button } from '@/components/ui/button'

export function PrintButton() {
  return (
    <Button variant="outline" className="print-hide" onClick={() => window.print()}>
      Exporter PDF
    </Button>
  )
}
