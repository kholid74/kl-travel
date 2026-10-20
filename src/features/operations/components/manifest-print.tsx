"use client"

import { useParams } from "next/navigation"
import { useMemo } from "react"
import { formatDateRange, formatDateTime, formatPhone } from "@/lib/format"
import { useLive } from "@/hooks/use-live"
import { Logo } from "@/components/shared/logo"
import { PrintSheet } from "@/components/shared/print-sheet"
import { PrintSkeleton } from "@/features/invoices/components/invoice-print"
import { manifestRows, operationsRow } from "@/services/queries/operations"
import { ManifestTable } from "./manifest-table"

/** Must sit inside <Suspense>: the id is only known at request time. */
export function ManifestPrintRoute() {
  const { departureId } = useParams<{ departureId: string }>()
  const live = useLive()
  const data = useMemo(() => {
    if (!live) return undefined
    const departure = live.db.departures[departureId]
    if (!departure) return null
    return { row: operationsRow(live.db, departure, live.now, live.today), manifest: manifestRows(live.db, departureId) }
  }, [live, departureId])

  if (!live || data === undefined) return <PrintSkeleton />
  if (!data) return <p className="p-8 text-center text-sm text-muted-foreground">Keberangkatan tidak ditemukan di data demo browser ini.</p>
  const { row, manifest } = data
  const { departure, pkg, guide } = row
  const incomplete = manifest.filter((r) => r.missing.length > 0).length

  return (
    <PrintSheet title={`Manifest ${departure.code}`}>
      <article className="text-[11px] leading-relaxed text-ink-900">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
          <Logo className="text-ocean-900" />
          <div className="text-right">
            <p className="text-xs font-semibold tracking-[0.2em] text-text-muted uppercase">Manifest peserta</p>
            <p className="mt-1 text-base font-semibold text-text-strong">{departure.code}</p>
            <p className="text-text-muted">Dicetak {formatDateTime(live.now)}</p>
          </div>
        </header>
        <section className="grid grid-cols-2 gap-4 border-b border-line py-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            <dt className="text-text-muted">Paket</dt>
            <dd className="font-semibold">{pkg?.title}</dd>
            <dt className="text-text-muted">Tanggal</dt>
            <dd>{formatDateRange(departure.startDate, departure.endDate)}</dd>
            <dt className="text-text-muted">Peserta</dt>
            <dd>
              {manifest.length} orang{incomplete > 0 && ` · ${incomplete} data belum lengkap`}
            </dd>
          </dl>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            <dt className="text-text-muted">Guide</dt>
            <dd>{guide ? `${guide.name} · ${formatPhone(guide.phone)}` : "Belum ditugaskan"}</dd>
            <dt className="text-text-muted">Titik kumpul</dt>
            <dd>
              {pkg?.meetingPoint.name}
              {pkg?.meetingPoint.time && ` · ${pkg.meetingPoint.time}`}
            </dd>
            {row.seats.held > 0 && (
              <>
                <dt className="text-text-muted">Catatan</dt>
                <dd>{row.seats.held} kursi masih ditahan booking yang belum lunas DP, belum masuk manifest.</dd>
              </>
            )}
          </dl>
        </section>
        <div className="mt-4">
          <ManifestTable rows={manifest} ageOn={departure.startDate} variant="print" />
        </div>
        <footer className="mt-6 border-t border-line pt-3 text-[10px] text-text-muted">
          Data pribadi peserta hanya untuk keperluan operasional trip. Dokumen demo: nama dan kontak fiktif, NusaVista Journey adalah merek fiktif.
        </footer>
      </article>
    </PrintSheet>
  )
}
