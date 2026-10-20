"use client"

import { useParams } from "next/navigation"
import { useMemo } from "react"
import { getIndexes } from "@/domain/indexes"
import { useLive } from "@/hooks/use-live"
import { PrintSheet } from "@/components/shared/print-sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { invoiceView } from "@/services/queries/invoices"
import { InvoiceDocument } from "./invoice-document"

/** Must sit inside <Suspense>: the id is only known at request time. */
export function InvoicePrintRoute() {
  const { id } = useParams<{ id: string }>()
  const live = useLive()
  const view = useMemo(() => (live ? invoiceView(live.db, id, live.today) : undefined), [live, id])

  if (!live || view === undefined) return <PrintSkeleton />
  if (!view) return <p className="p-8 text-center text-sm text-muted-foreground">Invoice tidak ditemukan di data demo browser ini.</p>
  return (
    <PrintSheet title={`Invoice ${view.invoice.number}`}>
      <InvoiceDocument view={view} settings={live.db.settings} pax={getIndexes(live.db).paxOf(view.booking.id)} />
    </PrintSheet>
  )
}

export function PrintSkeleton() {
  return (
    <div className="mx-auto my-6 grid w-full max-w-[210mm] gap-4 bg-white p-[16mm]" aria-busy="true" aria-label="Memuat dokumen">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
