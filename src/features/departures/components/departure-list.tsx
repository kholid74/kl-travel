"use client"

import Link from "next/link"
import { useMemo } from "react"
import { CalendarDays, List } from "lucide-react"
import { formatDateRange } from "@/lib/format"
import { DEPARTURE_STATUS_LABEL } from "@/domain/labels"
import type { DepartureDisplayStatus } from "@/domain/rules/availability"
import { useLive } from "@/hooks/use-live"
import { useQueryParams } from "@/hooks/use-query-params"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { FilterBar, FilterSelect, ViewToggle } from "@/components/dashboard/filters"
import { PageHeader } from "@/components/dashboard/page-header"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { SeatMeter } from "@/components/shared/seat-meter"
import { EmptyState } from "@/components/shared/states"
import { StatusBadge } from "@/components/shared/status-badge"
import { DEPARTURE_STATUS_TONE } from "@/features/packages/labels"
import { useUiStore } from "@/stores/ui-store"
import { departureRows, type DepartureRow } from "@/services/queries/departures"
import { DepartureFormSheet } from "./departure-form-sheet"
import { MonthCalendar } from "./month-calendar"

const KEYS = ["view", "bulan", "paket", "status", "jenis", "waktu"] as const
const STATUSES = Object.keys(DEPARTURE_STATUS_LABEL) as DepartureDisplayStatus[]

const columns: Column<DepartureRow>[] = [
  {
    key: "date",
    header: "Tanggal",
    sortValue: (r) => r.departure.startDate,
    cell: (r) => (
      <div>
        <Link href={`/dashboard/departures/${r.departure.id}`} className="font-semibold whitespace-nowrap text-text-strong hover:underline">
          {formatDateRange(r.departure.startDate, r.departure.endDate)}
        </Link>
        <p className="text-xs whitespace-nowrap text-text-subtle">{r.departure.code}</p>
      </div>
    ),
  },
  {
    key: "package",
    header: "Paket",
    sortValue: (r) => r.pkg?.title ?? "",
    cell: (r) => (
      <div className="max-w-64">
        <p className="truncate text-text-strong">{r.pkg?.title}</p>
        <p className="text-xs text-text-subtle">{r.departure.kind === "private" ? "Keberangkatan privat" : "Jadwal open trip"}</p>
      </div>
    ),
  },
  {
    key: "seats",
    header: "Kursi",
    sortValue: (r) => r.seats.occupancy,
    cell: (r) => (
      <div className="w-36">
        <SeatMeter seats={r.seats} showLegend={false} />
        <p className="mt-1 text-xs whitespace-nowrap text-text-subtle tabular-nums">
          {r.seats.allocated}/{r.seats.capacity} terisi{r.seats.held > 0 && ` · ${r.seats.held} ditahan`}
        </p>
      </div>
    ),
  },
  { key: "bookings", header: "Booking", align: "right", sortValue: (r) => r.bookings, cell: (r) => r.bookings },
  { key: "guide", header: "Guide", wide: true, sortValue: (r) => r.guide?.name ?? "", cell: (r) => <span className="whitespace-nowrap">{r.guide?.name ?? <span className="text-text-subtle">Belum ada</span>}</span> },
  {
    key: "status",
    header: "Status",
    sortValue: (r) => STATUSES.indexOf(r.status),
    cell: (r) => (
      <div className="flex flex-col items-start gap-1">
        <StatusBadge tone={DEPARTURE_STATUS_TONE[r.status]}>{r.status === "limited" ? `Sisa ${r.seats.available} kursi` : DEPARTURE_STATUS_LABEL[r.status]}</StatusBadge>
        {r.seats.guaranteed && r.status !== "cancelled" && r.status !== "completed" && <span className="text-[0.6875rem] font-medium text-tone-success">Pasti berangkat</span>}
      </div>
    ),
  },
]

export function DepartureList() {
  const live = useLive()
  const [query, setQuery] = useQueryParams(KEYS)
  const savedView = useUiStore((state) => state.views.departures)
  const setView = useUiStore((state) => state.setView)
  const view = (query.view || savedView || "list") === "calendar" ? "calendar" : "list"
  const rows = useMemo(() => (live ? departureRows(live.db, live.now, live.today) : []), [live])
  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (query.paket && r.departure.packageId !== query.paket) return false
        if (query.status && r.status !== query.status) return false
        if (query.jenis && r.departure.kind !== query.jenis) return false
        if (view === "list" && live) {
          const past = r.departure.endDate < live.today
          if ((query.waktu || "mendatang") === "mendatang" ? past : query.waktu === "lalu" ? !past : false) return false
        }
        return true
      }),
    [rows, query, view, live],
  )
  if (!live) return <PageSkeleton />
  const { db, today } = live
  const month = /^\d{4}-\d{2}$/.test(query.bulan) ? query.bulan : today.slice(0, 7)
  const packages = Object.values(db.packages).filter((p) => p.tripType !== "custom")

  return (
    <div>
      <PageHeader
        title="Keberangkatan"
        description="Sisa kursi dihitung dari booking terkonfirmasi dan kursi yang sedang ditahan, bukan diisi manual."
        actions={
          <>
            <ViewToggle
              label="Tampilan"
              value={view}
              onChange={(next) => {
                setView("departures", next)
                setQuery({ view: next })
              }}
              options={[
                { value: "list", label: "Tabel", icon: List },
                { value: "calendar", label: "Kalender", icon: CalendarDays },
              ]}
            />
            <DepartureFormSheet db={db} today={today} />
          </>
        }
      />
      <FilterBar active={Boolean(query.paket || query.status || query.jenis || query.waktu)} onReset={() => setQuery({ paket: null, status: null, jenis: null, waktu: null })}>
        {view === "list" && (
          <FilterSelect
            label="Waktu"
            value={query.waktu === "semua" ? "semua" : query.waktu}
            onChange={(waktu) => setQuery({ waktu })}
            allLabel="Mendatang & berjalan"
            options={[
              { value: "lalu", label: "Sudah lewat" },
              { value: "semua", label: "Semua waktu" },
            ]}
          />
        )}
        <FilterSelect label="Paket" value={query.paket} onChange={(paket) => setQuery({ paket })} allLabel="Semua paket" options={packages.map((p) => ({ value: p.id, label: p.title }))} />
        <FilterSelect label="Status" value={query.status} onChange={(status) => setQuery({ status })} allLabel="Semua status" options={STATUSES.map((s) => ({ value: s, label: DEPARTURE_STATUS_LABEL[s] }))} />
        <FilterSelect
          label="Jenis"
          value={query.jenis}
          onChange={(jenis) => setQuery({ jenis })}
          allLabel="Semua jenis"
          options={[
            { value: "scheduled", label: "Jadwal open trip" },
            { value: "private", label: "Privat" },
          ]}
        />
      </FilterBar>
      {view === "calendar" ? (
        <MonthCalendar month={month} today={today} rows={filtered} onMonthChange={(bulan) => setQuery({ bulan })} />
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          caption="Daftar keberangkatan"
          getRowKey={(r) => r.departure.id}
          getRowHref={(r) => `/dashboard/departures/${r.departure.id}`}
          defaultSort={{ key: "date", dir: query.waktu === "lalu" ? "desc" : "asc" }}
          empty={<EmptyState icon={CalendarDays} title="Tidak ada keberangkatan yang cocok" description="Ubah filter atau jadwalkan keberangkatan baru." />}
          renderCard={(r) => (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-text-strong">{formatDateRange(r.departure.startDate, r.departure.endDate)}</p>
                  <p className="truncate text-xs text-text-subtle">{r.pkg?.title}</p>
                </div>
                <StatusBadge tone={DEPARTURE_STATUS_TONE[r.status]}>{DEPARTURE_STATUS_LABEL[r.status]}</StatusBadge>
              </div>
              <SeatMeter seats={r.seats} className="mt-3" />
            </div>
          )}
        />
      )}
    </div>
  )
}
