"use client"

import { ErrorState } from "@/components/shared/states"
import { Button } from "@/components/ui/button"

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <ErrorState
        title="Modul ini tidak dapat dimuat"
        description="Coba muat ulang. Bila masalah berlanjut, reset data demo melalui badge Mode Demo."
        action={<Button onClick={reset}>Coba lagi</Button>}
      />
    </div>
  )
}
