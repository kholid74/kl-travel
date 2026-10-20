"use client"

import { useState } from "react"
import { AlertTriangle, X } from "lucide-react"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { demoStatus } from "@/services/demo-service"
import { useDbStore } from "@/stores/db-store"
import { ResetDemoButton } from "./demo-panel"

/**
 * Data-health notices (architecture.md §5.4): an old seed anchor, a newer seed version, a
 * corrupt document that was rebuilt, or storage that does not persist. Dismissible per page load.
 */
export function DemoDataBanner({ variant = "dashboard" }: { variant?: "dashboard" | "public" }) {
  const db = useDbStore((state) => state.db)
  const persistent = useDbStore((state) => state.persistent)
  const notices = useDbStore((state) => state.notices)
  const [dismissed, setDismissed] = useState<string | null>(null)
  if (!db) return null

  // Only rendered after hydration (db is null on the server), so reading the clock is safe.
  const status = demoStatus(db, new Date().toISOString())
  let key: string | null = null
  let message = ""
  let offerReset = false
  if (notices.includes("reset_corrupt")) {
    key = "corrupt"
    message = "Data demo di browser ini tidak bisa dibaca, jadi dibuat ulang dari awal."
  } else if (status.outdated) {
    key = "outdated"
    message = "Versi data demo yang lebih baru tersedia. Reset untuk memakai skenario terbaru."
    offerReset = true
  } else if (status.stale) {
    key = "stale"
    message = `Data demo dibuat ${formatDate(status.seedAnchor)} (${status.ageDays} hari lalu), jadi jadwal dan tenggat mulai tidak relevan. Reset untuk menghitung ulang dari hari ini.`
    offerReset = true
  } else if (!persistent) {
    key = "memory"
    message = "Penyimpanan browser tidak tersedia. Perubahan akan hilang saat halaman dimuat ulang."
  }
  if (!key || dismissed === key) return null

  return (
    <div role="status" className={cn("border-b", variant === "dashboard" ? "border-tone-warning/20 bg-tone-warning-bg text-tone-warning" : "border-sand-300 bg-sand-100 text-sand-800")}>
      <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-[0.8125rem]", variant === "dashboard" ? "px-4 md:px-6" : "container-page")}>
        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1">{message}</p>
        {offerReset && (
          <ResetDemoButton size="sm" variant="secondary" className="h-7">
            Reset data demo
          </ResetDemoButton>
        )}
        <button type="button" onClick={() => setDismissed(key)} className="rounded-sm p-1 outline-none hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-ring" aria-label="Tutup pemberitahuan">
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
