"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Package, Plus } from "lucide-react"
import { formatDuration, formatIDR } from "@/lib/format"
import type { PackageStatus, TourPackage } from "@/domain/entities"
import { getIndexes } from "@/domain/indexes"
import { PACKAGE_STATUS_LABEL, TRIP_TYPE_LABEL } from "@/domain/labels"
import { startingPrice } from "@/domain/rules/pricing"
import type { TripType } from "@/domain/types/common"
import { useLive } from "@/hooks/use-live"
import { useQueryParams } from "@/hooks/use-query-params"
import { useUrlSearchInput } from "@/hooks/use-url-search-input"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { FilterBar, FilterSelect, SearchField } from "@/components/dashboard/filters"
import { PageHeader } from "@/components/dashboard/page-header"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { SmartImage } from "@/components/shared/smart-image"
import { EmptyState } from "@/components/shared/states"
import { StatusBadge, TripTypeBadge } from "@/components/shared/status-badge"
import { packageAvailability } from "@/services/queries/catalog"
import { PACKAGE_STATUS_TONE } from "../../labels"

const KEYS = ["q", "jenis", "status", "destinasi"] as const

interface Row {
  pkg: TourPackage
  destination: string
  upcoming: number
  bookable: number
  bookings: number
}

const columns: Column<Row>[] = [
  {
    key: "title",
    header: "Paket",
    sortValue: (r) => r.pkg.title,
    cell: (r) => (
      <div className="flex items-center gap-3">
        <div className="relative hidden h-10 w-14 shrink-0 overflow-hidden rounded bg-muted sm:block">
          <SmartImage mediaId={r.pkg.coverMediaId} fill sizes="56px" alt="" />
        </div>
        <div className="min-w-0">
          <Link href={`/dashboard/packages/${r.pkg.id}`} className="block max-w-72 truncate font-semibold text-text-strong hover:underline">
            {r.pkg.title}
          </Link>
          <p className="text-xs text-text-subtle">
            {r.pkg.code} · {r.destination}
          </p>
        </div>
      </div>
    ),
  },
  { key: "type", header: "Jenis", sortValue: (r) => r.pkg.tripType, cell: (r) => <TripTypeBadge type={r.pkg.tripType} /> },
  { key: "duration", header: "Durasi", sortValue: (r) => r.pkg.durationDays, cell: (r) => formatDuration(r.pkg.durationDays, r.pkg.durationNights) },
  {
    key: "price",
    header: "Mulai dari",
    align: "right",
    sortValue: (r) => startingPrice(r.pkg) ?? 0,
    cell: (r) => <span className="whitespace-nowrap">{startingPrice(r.pkg) === null ? "Penawaran" : formatIDR(startingPrice(r.pkg)!)}</span>,
  },
  {
    key: "departures",
    header: "Jadwal mendatang",
    align: "right",
    sortValue: (r) => r.upcoming,
    cell: (r) => (r.pkg.tripType === "open" ? <span className="whitespace-nowrap">{r.bookable} dari {r.upcoming} bisa dipesan</span> : <span className="text-text-subtle">{r.upcoming} privat</span>),
  },
  { key: "bookings", header: "Booking", align: "right", wide: true, sortValue: (r) => r.bookings, cell: (r) => r.bookings },
  { key: "status", header: "Status", sortValue: (r) => r.pkg.status, cell: (r) => <StatusBadge tone={PACKAGE_STATUS_TONE[r.pkg.status]}>{PACKAGE_STATUS_LABEL[r.pkg.status]}</StatusBadge> },
]

export function PackageList() {
  const live = useLive()
  const [query, setQuery] = useQueryParams(KEYS)
  const search = useUrlSearchInput(query.q, (q) => setQuery({ q }))
  const rows = useMemo<Row[]>(() => {
    if (!live) return []
    const { db, now, today } = live
    const idx = getIndexes(db)
    return Object.values(db.packages).map((pkg) => {
      const availability = packageAvailability(db, pkg.id, now)
      const privateUpcoming = (idx.departuresByPackage.get(pkg.id) ?? []).filter((d) => d.kind === "private" && !d.cancelledAt && d.startDate > today).length
      return {
        pkg,
        destination: db.destinations[pkg.destinationId]?.name ?? "—",
        upcoming: pkg.tripType === "open" ? availability.options.length : privateUpcoming,
        bookable: availability.bookableCount,
        bookings: (idx.departuresByPackage.get(pkg.id) ?? []).reduce((n, d) => n + (idx.bookingsByDeparture.get(d.id) ?? []).filter((b) => b.status !== "cancelled").length, 0),
      }
    })
  }, [live])
  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (query.jenis && r.pkg.tripType !== query.jenis) return false
        if (query.status && r.pkg.status !== query.status) return false
        if (query.destinasi && r.pkg.destinationId !== query.destinasi) return false
        const term = search.value.trim().toLowerCase()
        return !term || `${r.pkg.title} ${r.pkg.code} ${r.destination}`.toLowerCase().includes(term)
      }),
    [rows, query, search.value],
  )
  if (!live) return <PageSkeleton />
  const { db } = live

  return (
    <div>
      <PageHeader
        title="Paket Wisata"
        description="Open trip, private trip, dan paket custom hasil penawaran. Hanya paket berstatus Terbit yang tampil di website."
        actions={
          <PermissionButton permission="packages.manage" asChild>
            <Link href="/dashboard/packages/new">
              <Plus aria-hidden="true" /> Buat paket
            </Link>
          </PermissionButton>
        }
      />
      <FilterBar
        active={Boolean(query.jenis || query.status || query.destinasi || search.value)}
        onReset={() => {
          search.reset()
          setQuery({ q: null, jenis: null, status: null, destinasi: null })
        }}
      >
        <SearchField value={search.value} onChange={search.setValue} placeholder="Cari paket atau kode…" />
        <FilterSelect label="Jenis" value={query.jenis} onChange={(jenis) => setQuery({ jenis })} allLabel="Semua jenis" options={(Object.keys(TRIP_TYPE_LABEL) as TripType[]).map((t) => ({ value: t, label: TRIP_TYPE_LABEL[t] }))} />
        <FilterSelect label="Status" value={query.status} onChange={(status) => setQuery({ status })} allLabel="Semua status" options={(Object.keys(PACKAGE_STATUS_LABEL) as PackageStatus[]).map((s) => ({ value: s, label: PACKAGE_STATUS_LABEL[s] }))} />
        <FilterSelect
          label="Destinasi"
          value={query.destinasi}
          onChange={(destinasi) => setQuery({ destinasi })}
          allLabel="Semua destinasi"
          options={Object.values(db.destinations).map((d) => ({ value: d.id, label: d.name }))}
        />
      </FilterBar>
      <DataTable
        rows={filtered}
        columns={columns}
        caption="Daftar paket"
        getRowKey={(r) => r.pkg.id}
        getRowHref={(r) => `/dashboard/packages/${r.pkg.id}`}
        defaultSort={{ key: "title", dir: "asc" }}
        empty={<EmptyState icon={Package} title="Tidak ada paket yang cocok" description="Ubah filter atau buat paket baru." />}
        renderCard={(r) => (
          <div className="flex gap-3">
            <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded bg-muted">
              <SmartImage mediaId={r.pkg.coverMediaId} fill sizes="80px" alt="" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-text-strong">{r.pkg.title}</p>
              <p className="text-xs text-text-subtle">
                {r.destination} · {formatDuration(r.pkg.durationDays, r.pkg.durationNights)}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <TripTypeBadge type={r.pkg.tripType} />
                <StatusBadge tone={PACKAGE_STATUS_TONE[r.pkg.status]}>{PACKAGE_STATUS_LABEL[r.pkg.status]}</StatusBadge>
              </div>
            </div>
          </div>
        )}
      />
    </div>
  )
}
