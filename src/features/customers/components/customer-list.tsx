"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Users } from "lucide-react"
import { toDateOnlyWIB } from "@/lib/dates"
import { formatDate, formatIDR, formatPhone } from "@/lib/format"
import { CUSTOMER_STAGE_LABEL, SOURCE_LABEL } from "@/domain/labels"
import type { CustomerStage } from "@/domain/rules/customer-identity"
import type { Source } from "@/domain/types/common"
import { useLive } from "@/hooks/use-live"
import { useQueryParams } from "@/hooks/use-query-params"
import { useUrlSearchInput } from "@/hooks/use-url-search-input"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { FilterBar, FilterSelect, SearchField } from "@/components/dashboard/filters"
import { PageHeader } from "@/components/dashboard/page-header"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { EmptyState } from "@/components/shared/states"
import { StatusBadge } from "@/components/shared/status-badge"
import { CUSTOMER_STAGE_TONE } from "@/features/bookings/labels"
import { customerRows, matchesCustomerSearch, type CustomerRow } from "@/services/queries/customers"

const KEYS = ["q", "tahap", "sumber"] as const
const STAGES = Object.keys(CUSTOMER_STAGE_LABEL) as CustomerStage[]

const columns: Column<CustomerRow>[] = [
  {
    key: "name",
    header: "Pelanggan",
    sortValue: (r) => r.customer.fullName,
    cell: (r) => (
      <div>
        <Link href={`/dashboard/customers/${r.customer.id}`} className="block max-w-52 truncate font-semibold text-text-strong hover:underline">
          {r.customer.fullName}
        </Link>
        <p className="text-xs text-text-subtle">
          {r.customer.code}
          {r.customer.city && ` · ${r.customer.city}`}
        </p>
      </div>
    ),
  },
  {
    key: "contact",
    header: "Kontak",
    cell: (r) => (
      <div className="text-xs">
        <p className="whitespace-nowrap text-text-strong">{formatPhone(r.customer.phone)}</p>
        <p className="max-w-52 truncate text-text-subtle">{r.customer.email ?? "—"}</p>
      </div>
    ),
  },
  { key: "stage", header: "Tahap", sortValue: (r) => STAGES.indexOf(r.stage), cell: (r) => <StatusBadge tone={CUSTOMER_STAGE_TONE[r.stage]}>{CUSTOMER_STAGE_LABEL[r.stage]}</StatusBadge> },
  { key: "bookings", header: "Booking", align: "right", sortValue: (r) => r.bookings, cell: (r) => r.bookings },
  { key: "value", header: "Nilai", align: "right", sortValue: (r) => r.value, cell: (r) => <span className="whitespace-nowrap">{formatIDR(r.value)}</span> },
  { key: "last", header: "Aktivitas terakhir", sortValue: (r) => r.lastActivity, cell: (r) => <span className="whitespace-nowrap">{formatDate(toDateOnlyWIB(r.lastActivity))}</span> },
  { key: "source", header: "Sumber awal", wide: true, sortValue: (r) => r.customer.acquisitionSource, cell: (r) => <span className="whitespace-nowrap text-text-muted">{SOURCE_LABEL[r.customer.acquisitionSource]}</span> },
]

export function CustomerList() {
  const live = useLive()
  const [query, setQuery] = useQueryParams(KEYS)
  const search = useUrlSearchInput(query.q, (q) => setQuery({ q }))
  const rows = useMemo(() => (live ? customerRows(live.db) : []), [live])
  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (query.tahap && r.stage !== query.tahap) return false
        if (query.sumber && r.customer.acquisitionSource !== query.sumber) return false
        return matchesCustomerSearch(r, search.value.trim())
      }),
    [rows, query, search.value],
  )
  if (!live) return <PageSkeleton />
  const counts = Object.fromEntries(STAGES.map((s) => [s, rows.filter((r) => r.stage === s).length])) as Record<CustomerStage, number>

  return (
    <div>
      <PageHeader
        title="Pelanggan"
        description={`${rows.length} pelanggan: ${counts.prospect} prospek, ${counts.customer} pelanggan, ${counts.repeat} repeat. Tahap dihitung dari riwayat booking.`}
      />
      <FilterBar
        active={Boolean(query.tahap || query.sumber || search.value)}
        onReset={() => {
          search.reset()
          setQuery({ q: null, tahap: null, sumber: null })
        }}
      >
        <SearchField value={search.value} onChange={search.setValue} placeholder="Cari nama, telepon, email…" />
        <FilterSelect label="Tahap" value={query.tahap} onChange={(tahap) => setQuery({ tahap })} allLabel="Semua tahap" options={STAGES.map((s) => ({ value: s, label: `${CUSTOMER_STAGE_LABEL[s]} (${counts[s]})` }))} />
        <FilterSelect
          label="Sumber"
          value={query.sumber}
          onChange={(sumber) => setQuery({ sumber })}
          allLabel="Semua sumber"
          options={(Object.keys(SOURCE_LABEL) as Source[]).map((s) => ({ value: s, label: SOURCE_LABEL[s] }))}
        />
      </FilterBar>
      <DataTable
        rows={filtered}
        columns={columns}
        caption="Daftar pelanggan"
        getRowKey={(r) => r.customer.id}
        getRowHref={(r) => `/dashboard/customers/${r.customer.id}`}
        defaultSort={{ key: "last", dir: "desc" }}
        empty={<EmptyState icon={Users} title="Tidak ada pelanggan yang cocok" description="Ubah filter atau kata kunci pencarian." />}
        renderCard={(r) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-text-strong">{r.customer.fullName}</p>
              <p className="text-xs text-text-subtle">{formatPhone(r.customer.phone)}</p>
              <p className="mt-1 text-xs text-text-subtle">
                {r.bookings} booking · {formatIDR(r.value)}
              </p>
            </div>
            <StatusBadge tone={CUSTOMER_STAGE_TONE[r.stage]}>{CUSTOMER_STAGE_LABEL[r.stage]}</StatusBadge>
          </div>
        )}
      />
    </div>
  )
}
