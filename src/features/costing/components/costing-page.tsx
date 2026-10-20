"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Calculator } from "lucide-react"
import { formatDateRange, formatIDR, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import { getIndexes } from "@/domain/indexes"
import { useLive } from "@/hooks/use-live"
import { useQueryParams } from "@/hooks/use-query-params"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { FilterBar, FilterSelect } from "@/components/dashboard/filters"
import { PageHeader } from "@/components/dashboard/page-header"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { SectionCard } from "@/components/dashboard/section-card"
import { EmptyState } from "@/components/shared/states"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { costingSource, departureProfitRows, type DepartureProfitRow } from "@/services/queries/costing"
import { ActualCosts } from "./actual-costs"
import { CostSimulator } from "./cost-simulator"

const KEYS = ["departure", "package", "fase"] as const
const PHASE_LABEL: Record<DepartureProfitRow["phase"], string> = { upcoming: "Mendatang", running: "Berlangsung", finished: "Selesai" }

const columns: Column<DepartureProfitRow>[] = [
  {
    key: "departure",
    header: "Keberangkatan",
    sortValue: (r) => r.departure.startDate,
    cell: (r) => (
      <div className="max-w-64">
        <p className="truncate font-medium text-text-strong">{r.pkg?.title}</p>
        <p className="text-xs text-text-subtle">
          {formatDateRange(r.departure.startDate, r.departure.endDate)} · {r.departure.code}
        </p>
      </div>
    ),
  },
  { key: "phase", header: "Fase", sortValue: (r) => r.phase, cell: (r) => <span className="whitespace-nowrap text-text-muted">{PHASE_LABEL[r.phase]}</span> },
  { key: "pax", header: "Pax", align: "right", sortValue: (r) => r.estimate.pax, cell: (r) => r.estimate.pax },
  { key: "revenue", header: "Pendapatan", align: "right", sortValue: (r) => r.estimate.revenue, cell: (r) => <span className="whitespace-nowrap">{formatIDR(r.estimate.revenue)}</span> },
  {
    key: "estimate",
    header: "Laba estimasi",
    align: "right",
    sortValue: (r) => r.estimate.profit,
    cell: (r) =>
      r.estimate.pax === 0 ? (
        <span className="text-text-subtle">Belum ada peserta</span>
      ) : (
        <div className="whitespace-nowrap">
          <p className={cn("font-medium", r.estimate.profit < 0 && "text-tone-danger")}>{formatIDR(r.estimate.profit)}</p>
          {r.estimate.revenue > 0 && <p className="text-xs text-text-subtle">margin {formatPercent(r.estimate.profit / r.estimate.revenue)}</p>}
        </div>
      ),
  },
  {
    key: "realized",
    header: "Laba realisasi",
    align: "right",
    sortValue: (r) => r.realized.profit ?? Number.NEGATIVE_INFINITY,
    cell: (r) =>
      r.realized.profit === null ? (
        <div className="max-w-48 text-right">
          <p className="text-text-muted">Belum dapat dihitung</p>
          <p className="text-xs text-text-subtle">{r.realized.pendingReason}</p>
        </div>
      ) : (
        <div className="whitespace-nowrap">
          <p className={cn("font-medium", r.realized.profit < 0 && "text-tone-danger")}>{formatIDR(r.realized.profit)}</p>
          {r.realized.margin !== null && <p className="text-xs text-text-subtle">margin {formatPercent(r.realized.margin)}</p>}
        </div>
      ),
  },
]

export function CostingPage() {
  const live = useLive()
  const [query, setQuery] = useQueryParams(KEYS)
  const rows = useMemo(() => (live ? departureProfitRows(live.db, live.today) : []), [live])

  const selection = useMemo(() => {
    if (query.departure || query.package) return { departureId: query.departure || undefined, packageId: query.departure ? undefined : query.package }
    // Default: the soonest upcoming departure with confirmed travelers.
    const first = rows.filter((r) => r.phase !== "finished" && r.estimate.pax > 0).sort((a, b) => a.departure.startDate.localeCompare(b.departure.startDate))[0]
    return { departureId: first?.departure.id }
  }, [query.departure, query.package, rows])
  const source = useMemo(() => (live ? costingSource(live.db, selection) : null), [live, selection])

  if (!live) return <PageSkeleton />
  const { db, today } = live
  const filtered = rows.filter((r) => !query.fase || r.phase === query.fase)
  const sourceValue = selection.departureId ? `dep:${selection.departureId}` : selection.packageId ? `pkg:${selection.packageId}` : ""
  const departures = [...rows].sort((a, b) => a.departure.startDate.localeCompare(b.departure.startDate))
  const packages = Object.values(db.packages)
    .filter((p) => p.status !== "archived" && (getIndexes(db).costItemsByPackage.get(p.id)?.length ?? 0) > 0)
    .sort((a, b) => a.title.localeCompare(b.title))
  const current = source?.departure ? rows.find((r) => r.departure.id === source.departure!.id) : undefined

  return (
    <div>
      <PageHeader
        title="HPP & Costing"
        description="Harga pokok per keberangkatan: biaya tetap per trip dan biaya per peserta. Semua angka laba adalah laba kotor sebelum overhead dan pajak."
      />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="grid w-full gap-1.5 sm:w-96">
          <span className="text-xs font-medium text-text-muted" id="sumber-label">
            Hitung untuk
          </span>
          <Select
            value={sourceValue}
            onValueChange={(value) => {
              const [kind, id] = value.split(":")
              setQuery(kind === "dep" ? { departure: id, package: null } : { package: id, departure: null })
            }}
          >
            <SelectTrigger aria-labelledby="sumber-label" className="w-full bg-card">
              <SelectValue placeholder="Pilih keberangkatan atau paket" />
            </SelectTrigger>
            <SelectContent>
              {(["upcoming", "running", "finished"] as const).map((phase) => {
                const list = departures.filter((r) => r.phase === phase)
                if (!list.length) return null
                return (
                  <SelectGroup key={phase}>
                    <SelectLabel>Keberangkatan {PHASE_LABEL[phase].toLowerCase()}</SelectLabel>
                    {(phase === "finished" ? [...list].reverse() : list).map((r) => (
                      <SelectItem key={r.departure.id} value={`dep:${r.departure.id}`}>
                        {r.pkg?.title} · {formatDateRange(r.departure.startDate, r.departure.endDate)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )
              })}
              <SelectGroup>
                <SelectLabel>Template biaya paket</SelectLabel>
                {packages.map((p) => (
                  <SelectItem key={p.id} value={`pkg:${p.id}`}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        {source && (
          <div className="flex flex-wrap gap-2">
            {source.departure ? (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/dashboard/departures/${source.departure.id}`}>Detail keberangkatan</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/dashboard/costing?package=${source.pkg.id}`}>Template paket</Link>
                </Button>
              </>
            ) : (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/dashboard/packages/${source.pkg.id}`}>Buka paket</Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {source ? (
        <div className="grid gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-text-strong">{source.title}</h2>
            <StatusBadge tone="neutral" dot={false}>
              {source.subtitle}
            </StatusBadge>
            {current && <StatusBadge tone={current.phase === "finished" ? "neutral" : "info"}>{PHASE_LABEL[current.phase]}</StatusBadge>}
          </div>
          <CostSimulator key={sourceValue} source={source} />
          {source.departure && current && today >= source.departure.startDate && (
            <ActualCosts departure={source.departure} items={source.items} estimate={current.estimate} realized={current.realized} />
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-line bg-card shadow-xs">
          <EmptyState icon={Calculator} title="Pilih keberangkatan atau paket" description="Simulator memakai komponen biaya dari keberangkatan atau template paket yang dipilih." />
        </div>
      )}

      <SectionCard
        className="mt-8"
        title="Estimasi vs realisasi per keberangkatan"
        description="Estimasi: pendapatan booking terkonfirmasi dikurangi biaya rencana. Realisasi: hanya untuk trip selesai yang seluruh biaya aktualnya sudah dicatat."
        bodyClassName="p-0"
      >
        <div className="px-5 pt-4">
          <FilterBar>
            <FilterSelect
              label="Fase keberangkatan"
              value={query.fase}
              onChange={(fase) => setQuery({ fase })}
              allLabel="Semua fase"
              options={(Object.keys(PHASE_LABEL) as DepartureProfitRow["phase"][]).map((p) => ({ value: p, label: PHASE_LABEL[p] }))}
            />
          </FilterBar>
        </div>
        <div className="px-5 pb-5">
          <DataTable
            rows={filtered}
            columns={columns}
            caption="Estimasi dan realisasi laba per keberangkatan"
            getRowKey={(r) => r.departure.id}
            getRowHref={(r) => `/dashboard/costing?departure=${r.departure.id}${query.fase ? `&fase=${query.fase}` : ""}`}
            defaultSort={{ key: "departure", dir: "asc" }}
            pageSize={10}
            empty={<EmptyState icon={Calculator} title="Tidak ada keberangkatan" description="Ubah filter fase." />}
            renderCard={(r) => (
              <div>
                <p className="font-semibold text-text-strong">{r.pkg?.title}</p>
                <p className="text-xs text-text-subtle">
                  {formatDateRange(r.departure.startDate, r.departure.endDate)} · {PHASE_LABEL[r.phase]} · {r.estimate.pax} pax
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Laba estimasi</dt>
                    <dd className={cn("font-semibold", r.estimate.profit < 0 && "text-tone-danger")}>{r.estimate.pax ? formatIDR(r.estimate.profit) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Laba realisasi</dt>
                    <dd className="font-semibold">{r.realized.profit === null ? <span className="font-normal text-text-muted">Belum dapat dihitung</span> : formatIDR(r.realized.profit)}</dd>
                  </div>
                </dl>
              </div>
            )}
          />
        </div>
      </SectionCard>
    </div>
  )
}
