"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Plus, Ticket } from "lucide-react"
import { toDateOnlyWIB } from "@/lib/dates"
import { formatDate, formatDateRange, formatIDR } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { BookingStatus } from "@/domain/entities"
import { BOOKING_STATUS_LABEL, PAYMENT_STATUS_LABEL, SOURCE_LABEL, TRIP_TYPE_LABEL } from "@/domain/labels"
import type { PaymentStatus } from "@/domain/rules/payment-status"
import type { Source, TripType } from "@/domain/types/common"
import { useLive } from "@/hooks/use-live"
import { useQueryParams } from "@/hooks/use-query-params"
import { useUrlSearchInput } from "@/hooks/use-url-search-input"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { FilterBar, FilterSelect, SearchField } from "@/components/dashboard/filters"
import { PageHeader } from "@/components/dashboard/page-header"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { EmptyState } from "@/components/shared/states"
import { StatusBadge } from "@/components/shared/status-badge"
import { bookingRows, isUnsettled, matchesSearch, type BookingRow } from "@/services/queries/bookings"
import { BOOKING_STATUS_TONE, PAYMENT_STATUS_TONE } from "../labels"

const KEYS = ["q", "status", "bayar", "jenis", "sumber", "keberangkatan"] as const
const STATUSES = Object.keys(BOOKING_STATUS_LABEL) as BookingStatus[]
const UNSETTLED = "belum-lunas"

const columns: Column<BookingRow>[] = [
  {
    key: "code",
    header: "Booking",
    sortValue: (r) => r.booking.createdAt,
    cell: (r) => (
      <div>
        <Link href={`/dashboard/bookings/${r.booking.id}`} className="font-semibold whitespace-nowrap text-text-strong hover:underline">
          {r.booking.code}
        </Link>
        <p className="text-xs whitespace-nowrap text-text-subtle">{formatDate(toDateOnlyWIB(r.booking.createdAt))}</p>
      </div>
    ),
  },
  {
    key: "customer",
    header: "Pelanggan",
    sortValue: (r) => r.customer?.fullName ?? "",
    cell: (r) => <span className="block max-w-44 truncate font-medium text-text-strong">{r.customer?.fullName}</span>,
  },
  {
    key: "trip",
    header: "Paket & keberangkatan",
    sortValue: (r) => r.departure?.startDate ?? "",
    cell: (r) => (
      <div className="max-w-64">
        <p className="truncate text-text-strong">{r.pkg?.title}</p>
        <p className="text-xs text-text-subtle">
          {r.departure ? formatDateRange(r.departure.startDate, r.departure.endDate) : "—"} · {TRIP_TYPE_LABEL[r.booking.tripType]}
        </p>
      </div>
    ),
  },
  { key: "pax", header: "Pax", align: "right", sortValue: (r) => r.pax, cell: (r) => r.pax },
  { key: "total", header: "Total", align: "right", sortValue: (r) => r.fin.total, cell: (r) => <span className="whitespace-nowrap">{formatIDR(r.fin.total)}</span> },
  {
    key: "status",
    header: "Status",
    sortValue: (r) => STATUSES.indexOf(r.booking.status),
    cell: (r) => <StatusBadge tone={BOOKING_STATUS_TONE[r.booking.status]}>{BOOKING_STATUS_LABEL[r.booking.status]}</StatusBadge>,
  },
  {
    key: "payment",
    header: "Pembayaran",
    sortValue: (r) => r.fin.outstanding,
    cell: (r) => (
      <div className="flex flex-col items-start gap-1">
        <StatusBadge tone={PAYMENT_STATUS_TONE[r.fin.status]}>{PAYMENT_STATUS_LABEL[r.fin.status]}</StatusBadge>
        {r.fin.hasPendingVerification && <span className="text-[0.6875rem] font-medium whitespace-nowrap text-tone-info">Perlu verifikasi</span>}
      </div>
    ),
  },
  { key: "source", header: "Sumber", wide: true, sortValue: (r) => r.booking.source, cell: (r) => <span className="whitespace-nowrap text-text-muted">{SOURCE_LABEL[r.booking.source]}</span> },
]

export function BookingList() {
  const live = useLive()
  const [query, setQuery] = useQueryParams(KEYS)
  const search = useUrlSearchInput(query.q, (q) => setQuery({ q }))

  const rows = useMemo(() => (live ? bookingRows(live.db, live.today) : []), [live])
  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (query.status && r.booking.status !== query.status) return false
        if (query.bayar === UNSETTLED ? !isUnsettled(r) : query.bayar && r.fin.status !== query.bayar) return false
        if (query.jenis && r.booking.tripType !== query.jenis) return false
        if (query.sumber && r.booking.source !== query.sumber) return false
        if (query.keberangkatan && r.booking.departureId !== query.keberangkatan) return false
        return matchesSearch(r, search.value.trim())
      }),
    [rows, query, search.value],
  )

  if (!live) return <PageSkeleton />
  const countBy = (status: BookingStatus | "") => rows.filter((r) => !status || r.booking.status === status).length
  const departure = query.keberangkatan ? live.db.departures[query.keberangkatan] : undefined
  const active = Boolean(query.bayar || query.jenis || query.sumber || query.keberangkatan || search.value)

  return (
    <div>
      <PageHeader
        title="Booking"
        description="Semua booking dari website, WhatsApp, dan kanal lain. Status pembayaran dihitung dari invoice dan pembayaran terverifikasi."
        actions={
          <PermissionButton permission="bookings.manage" asChild>
            <Link href="/dashboard/bookings/new">
              <Plus aria-hidden="true" /> Booking manual
            </Link>
          </PermissionButton>
        }
      />

      <div role="tablist" aria-label="Status booking" className="mb-4 flex gap-1 overflow-x-auto border-b border-line no-scrollbar">
        {(["", ...STATUSES] as const).map((status) => {
          const selected = query.status === status
          return (
            <button
              key={status || "semua"}
              role="tab"
              aria-selected={selected}
              onClick={() => setQuery({ status })}
              className={cn(
                "-mb-px inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected ? "border-ocean-800 text-text-strong" : "border-transparent text-text-muted hover:text-text-strong",
              )}
            >
              {status ? BOOKING_STATUS_LABEL[status] : "Semua"}
              <span className={cn("rounded-full px-1.5 text-xs tabular-nums", selected ? "bg-ocean-800 text-white" : "bg-muted text-text-muted")}>{countBy(status)}</span>
            </button>
          )
        })}
      </div>

      <FilterBar
        active={active}
        onReset={() => {
          search.reset()
          setQuery({ q: null, bayar: null, jenis: null, sumber: null, keberangkatan: null })
        }}
      >
        <SearchField value={search.value} onChange={search.setValue} placeholder="Cari kode, pelanggan, paket…" />
        <FilterSelect
          label="Status pembayaran"
          value={query.bayar}
          onChange={(bayar) => setQuery({ bayar })}
          allLabel="Semua pembayaran"
          options={[{ value: UNSETTLED, label: "Belum lunas (semua)" }, ...(Object.keys(PAYMENT_STATUS_LABEL) as PaymentStatus[]).map((s) => ({ value: s, label: PAYMENT_STATUS_LABEL[s] }))]}
        />
        <FilterSelect
          label="Jenis trip"
          value={query.jenis}
          onChange={(jenis) => setQuery({ jenis })}
          allLabel="Semua jenis"
          options={(Object.keys(TRIP_TYPE_LABEL) as TripType[]).map((t) => ({ value: t, label: TRIP_TYPE_LABEL[t] }))}
        />
        <FilterSelect
          label="Sumber"
          value={query.sumber}
          onChange={(sumber) => setQuery({ sumber })}
          allLabel="Semua sumber"
          options={(Object.keys(SOURCE_LABEL) as Source[]).map((s) => ({ value: s, label: SOURCE_LABEL[s] }))}
        />
        {departure && (
          <span className="inline-flex h-9 items-center gap-2 rounded-md border border-ocean-800 bg-card px-3 text-sm">
            Keberangkatan {departure.code}
            <button type="button" onClick={() => setQuery({ keberangkatan: null })} className="text-text-muted hover:text-text-strong" aria-label="Hapus filter keberangkatan">
              ×
            </button>
          </span>
        )}
      </FilterBar>

      <DataTable
        rows={filtered}
        columns={columns}
        caption="Daftar booking"
        getRowKey={(r) => r.booking.id}
        getRowHref={(r) => `/dashboard/bookings/${r.booking.id}`}
        defaultSort={{ key: "code", dir: "desc" }}
        empty={<EmptyState icon={Ticket} title="Tidak ada booking yang cocok" description="Ubah filter atau kata kunci pencarian." />}
        renderCard={(r) => (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-text-strong">{r.customer?.fullName}</p>
                <p className="text-xs text-text-subtle">
                  {r.booking.code} · {r.pax} pax
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">{formatIDR(r.fin.total)}</p>
            </div>
            <p className="mt-2 truncate text-sm">{r.pkg?.title}</p>
            <p className="text-xs text-text-subtle">{r.departure ? formatDateRange(r.departure.startDate, r.departure.endDate) : ""}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <StatusBadge tone={BOOKING_STATUS_TONE[r.booking.status]}>{BOOKING_STATUS_LABEL[r.booking.status]}</StatusBadge>
              <StatusBadge tone={PAYMENT_STATUS_TONE[r.fin.status]}>{PAYMENT_STATUS_LABEL[r.fin.status]}</StatusBadge>
            </div>
          </div>
        )}
      />
    </div>
  )
}
