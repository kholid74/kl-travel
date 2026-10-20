"use client"

import Link from "next/link"
import { useMemo } from "react"
import { AlertTriangle, ClipboardCheck, UserRound, Users } from "lucide-react"
import { addDays } from "@/lib/dates"
import { formatDateRange, formatRelativeDay } from "@/lib/format"
import { cn } from "@/lib/utils"
import { READINESS_LABEL } from "@/domain/labels"
import type { ReadinessStatus } from "@/domain/rules/trip-readiness"
import { useLive } from "@/hooks/use-live"
import { useQueryParams } from "@/hooks/use-query-params"
import { useUrlSearchInput } from "@/hooks/use-url-search-input"
import { FilterBar, FilterSelect, SearchField } from "@/components/dashboard/filters"
import { PageHeader } from "@/components/dashboard/page-header"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { EmptyState } from "@/components/shared/states"
import { StatusBadge } from "@/components/shared/status-badge"
import { Switch } from "@/components/ui/switch"
import { READINESS_TONE } from "@/features/packages/labels"
import { operationsBoard, type OperationsRow } from "@/services/queries/operations"
import { ProgressBar } from "./progress-bar"

const KEYS = ["q", "rentang", "perhatian"] as const
const COLUMNS: ReadinessStatus[] = ["not_started", "preparing", "ready", "in_progress"]
const WINDOWS = [
  { value: "30", label: "30 hari ke depan" },
  { value: "60", label: "60 hari ke depan" },
]

export function OperationsBoard() {
  const live = useLive()
  const [query, setQuery] = useQueryParams(KEYS)
  const search = useUrlSearchInput(query.q, (q) => setQuery({ q }))
  const rows = useMemo(() => (live ? operationsBoard(live.db, live.now, live.today) : []), [live])

  const filtered = useMemo(() => {
    if (!live) return []
    const term = search.value.trim().toLowerCase()
    const until = query.rentang ? addDays(live.today, Number(query.rentang)) : null
    return rows.filter((r) => {
      if (until && r.departure.startDate > until) return false
      if (query.perhatian && !r.readiness.atRisk) return false
      if (!term) return true
      return [r.pkg?.title, r.departure.code, r.guide?.name].filter(Boolean).join(" ").toLowerCase().includes(term)
    })
  }, [rows, live, query.rentang, query.perhatian, search.value])

  if (!live) return <PageSkeleton />
  const atRisk = rows.filter((r) => r.readiness.atRisk).length

  return (
    <div>
      <PageHeader
        title="Operasional Trip"
        description="Persiapan setiap keberangkatan yang belum selesai: checklist, guide, vendor, dan data peserta. Kartu bertanda merah perlu ditindaklanjuti."
      />

      <FilterBar
        active={Boolean(query.rentang || query.perhatian || search.value)}
        onReset={() => {
          search.reset()
          setQuery({ q: null, rentang: null, perhatian: null })
        }}
      >
        <SearchField value={search.value} onChange={search.setValue} placeholder="Cari paket, kode, guide…" />
        <FilterSelect label="Rentang keberangkatan" value={query.rentang} onChange={(rentang) => setQuery({ rentang })} allLabel="Semua jadwal" options={WINDOWS} />
        <label className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-card px-3 text-sm">
          <Switch checked={!!query.perhatian} onCheckedChange={(on) => setQuery({ perhatian: on ? "1" : null })} />
          Perlu perhatian
          <span className="rounded-full bg-tone-danger-bg px-1.5 text-xs font-semibold text-tone-danger tabular-nums">{atRisk}</span>
        </label>
      </FilterBar>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-line bg-card shadow-xs">
          <EmptyState icon={ClipboardCheck} title="Tidak ada trip yang cocok" description="Ubah filter untuk melihat trip lainnya." />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 min-[90rem]:grid-cols-4">
          {COLUMNS.map((status) => {
            const items = filtered.filter((r) => r.readiness.status === status)
            return (
              <section key={status} aria-labelledby={`kolom-${status}`} className="min-w-0">
                <h2 id={`kolom-${status}`} className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-strong">
                  {READINESS_LABEL[status]}
                  <span className="rounded-full bg-muted px-1.5 text-xs text-text-muted tabular-nums">{items.length}</span>
                </h2>
                {items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-xs text-text-subtle">Tidak ada trip.</p>
                ) : (
                  <ul className="grid gap-3">
                    {items.map((row) => (
                      <TripCard key={row.departure.id} row={row} today={live.today} />
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TripCard({ row, today }: { row: OperationsRow; today: string }) {
  const { departure, pkg, guide, seats, readiness, context, vendors } = row
  const confirmedVendors = vendors.filter((v) => v.status === "confirmed").length
  const openVendors = vendors.filter((v) => v.status === "requested").length
  return (
    <li>
      <Link
        href={`/dashboard/operations/${departure.id}`}
        className={cn(
          "block rounded-lg border bg-card p-4 shadow-xs outline-none transition-colors hover:border-line-strong/60 focus-visible:ring-2 focus-visible:ring-ring",
          readiness.atRisk ? "border-tone-danger/40" : "border-line",
        )}
      >
        <div className="flex items-start justify-between gap-2 text-xs">
          <span className="text-text-muted">{formatDateRange(departure.startDate, departure.endDate)}</span>
          <span className={cn("shrink-0 font-semibold", readiness.status === "in_progress" ? "text-tone-info" : "text-text-strong")}>
            {readiness.status === "in_progress" ? "Berlangsung" : formatRelativeDay(departure.startDate, today)}
          </span>
        </div>
        <p className="mt-1.5 font-semibold text-text-strong">{pkg?.title}</p>
        <p className="text-xs text-text-subtle">
          {departure.code}
          {departure.kind === "private" && " · privat"}
        </p>

        <div className="mt-3 flex items-center gap-3">
          <ProgressBar value={readiness.progress} label={`Progres persiapan ${departure.code}`} className="flex-1" tone={readiness.atRisk ? "danger" : readiness.status === "ready" ? "success" : "default"} />
          <span className="text-xs text-text-muted tabular-nums">
            {readiness.done}/{readiness.total}
          </span>
        </div>

        <ul className="mt-3 grid gap-1 text-xs text-text-muted">
          <li className="flex items-start gap-1.5">
            <Users className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            <span>
              {seats.allocated}/{seats.capacity} peserta terkonfirmasi
              {seats.guaranteed && departure.kind === "scheduled" && <span className="text-tone-success"> · pasti berangkat</span>}
            </span>
          </li>
          <li className={cn("flex items-start gap-1.5", !guide && "text-tone-warning")}>
            <UserRound className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            <span>{guide ? guide.name : "Guide belum ditugaskan"}</span>
          </li>
          <li className="flex items-start gap-1.5">
            <ClipboardCheck className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            <span>
              {confirmedVendors} vendor terkonfirmasi{openVendors > 0 && `, ${openVendors} menunggu`}
              {context.incompleteTravelers > 0 && <span className="text-tone-warning"> · {context.incompleteTravelers} data peserta kurang</span>}
            </span>
          </li>
        </ul>

        {readiness.atRisk && (
          <div className="mt-3 rounded-md bg-tone-danger-bg px-3 py-2 text-xs text-tone-danger">
            <p className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="size-3.5" aria-hidden="true" /> Perlu perhatian
            </p>
            <ul className="mt-0.5 list-disc pl-5">
              {readiness.riskReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
        {!readiness.atRisk && readiness.status === "ready" && (
          <StatusBadge tone={READINESS_TONE.ready} className="mt-3">
            Semua item selesai
          </StatusBadge>
        )}
      </Link>
    </li>
  )
}
