"use client"

import { useMemo } from "react"
import { formatDate, formatNumber } from "@/lib/format"
import { getIndexes } from "@/domain/indexes"
import { BOOKING_STATUS_LABEL } from "@/domain/labels"
import type { BookingStatus } from "@/domain/entities"
import { validateDatabase } from "@/domain/rules/validate-database"
import { StatusBadge } from "@/components/shared/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useDatabase, useDbStore } from "@/stores/db-store"

const STATUS_TONE: Record<BookingStatus, "info" | "warning" | "success" | "neutral" | "danger"> = {
  pending: "info",
  awaiting_payment: "warning",
  confirmed: "success",
  completed: "neutral",
  cancelled: "danger",
}

/** Counts and invariant check for the browser-local dataset. */
export function DataHealth() {
  const { db, ready } = useDatabase()
  const version = useDbStore((state) => state.version)

  const summary = useMemo(() => {
    if (!db) return null
    getIndexes(db)
    const bookings = Object.values(db.bookings)
    const byStatus = Object.fromEntries(
      (Object.keys(BOOKING_STATUS_LABEL) as BookingStatus[]).map((status) => [status, bookings.filter((b) => b.status === status).length]),
    ) as Record<BookingStatus, number>
    return {
      counts: [
        ["Destinasi", Object.keys(db.destinations).length],
        ["Paket", Object.keys(db.packages).length],
        ["Keberangkatan", Object.keys(db.departures).length],
        ["Booking", bookings.length],
        ["Pelanggan", Object.keys(db.customers).length],
        ["Inquiry", Object.keys(db.inquiries).length],
        ["Pembayaran", Object.keys(db.payments).length],
        ["Aktivitas", Object.keys(db.activity).length],
      ] as const,
      byStatus,
      issues: validateDatabase(db, new Date().toISOString()),
    }
  }, [db])

  if (!ready || !summary || !db) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.counts.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-kpi font-semibold text-text-strong tabular-nums">{formatNumber(value)}</dd>
          </div>
        ))}
      </dl>

      <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
        <h2 className="text-base font-semibold text-text-strong">Status booking</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(summary.byStatus) as BookingStatus[]).map((status) => (
            <li key={status}>
              <StatusBadge tone={STATUS_TONE[status]}>
                {BOOKING_STATUS_LABEL[status]} · {summary.byStatus[status]}
              </StatusBadge>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          Data demo dibuat {formatDate(db.meta.seedAnchor)} · versi snapshot {version} ·{" "}
          {summary.issues.length === 0 ? "semua invarian data terpenuhi" : `${summary.issues.length} pelanggaran invarian`}
        </p>
      </section>
    </div>
  )
}
