"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Receipt } from "lucide-react"
import { toDateOnlyWIB } from "@/lib/dates"
import { formatDate, formatDateRange, formatIDR, formatRelativeDay } from "@/lib/format"
import { cn } from "@/lib/utils"
import { PAYMENT_STATUS_LABEL } from "@/domain/labels"
import { useLive } from "@/hooks/use-live"
import { useQueryParams } from "@/hooks/use-query-params"
import { useUrlSearchInput } from "@/hooks/use-url-search-input"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { FilterBar, FilterSelect, SearchField } from "@/components/dashboard/filters"
import { PageHeader } from "@/components/dashboard/page-header"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { EmptyState } from "@/components/shared/states"
import { StatusBadge, type Tone } from "@/components/shared/status-badge"
import { PAYMENT_STATUS_TONE } from "@/features/bookings/labels"
import { invoiceRows, type InvoiceDisplayStatus, type InvoiceView } from "@/services/queries/invoices"

const KEYS = ["q", "status"] as const
const UNSETTLED = "belum-lunas"

export const INVOICE_STATUS_LABEL = (status: InvoiceDisplayStatus) => (status === "void" ? "Dibatalkan" : PAYMENT_STATUS_LABEL[status])
export const INVOICE_STATUS_TONE = (status: InvoiceDisplayStatus): Tone => (status === "void" ? "danger" : PAYMENT_STATUS_TONE[status])

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: UNSETTLED, label: "Belum lunas (semua)" },
  { value: "overdue", label: PAYMENT_STATUS_LABEL.overdue },
  { value: "partially_paid", label: PAYMENT_STATUS_LABEL.partially_paid },
  { value: "unpaid", label: PAYMENT_STATUS_LABEL.unpaid },
  { value: "paid", label: PAYMENT_STATUS_LABEL.paid },
  { value: "void", label: "Dibatalkan" },
]

export function InvoiceList() {
  const live = useLive()
  const [query, setQuery] = useQueryParams(KEYS)
  const search = useUrlSearchInput(query.q, (q) => setQuery({ q }))
  const rows = useMemo(() => (live ? invoiceRows(live.db, live.today) : []), [live])
  const filtered = useMemo(() => {
    const term = search.value.trim().toLowerCase()
    return rows.filter((r) => {
      if (query.status === UNSETTLED ? r.status === "void" || r.fin.outstanding === 0 : query.status && r.status !== query.status) return false
      if (!term) return true
      return [r.invoice.number, r.booking.code, r.customer?.fullName, r.pkg?.title].filter(Boolean).join(" ").toLowerCase().includes(term)
    })
  }, [rows, query.status, search.value])

  if (!live) return <PageSkeleton />
  const { today } = live

  const columns: Column<InvoiceView>[] = [
    {
      key: "number",
      header: "Invoice",
      sortValue: (r) => r.invoice.issuedAt,
      cell: (r) => (
        <div>
          <Link href={`/dashboard/invoices/${r.invoice.id}`} className="font-semibold whitespace-nowrap text-text-strong hover:underline">
            {r.invoice.number}
          </Link>
          <p className="text-xs whitespace-nowrap text-text-subtle">{formatDate(toDateOnlyWIB(r.invoice.issuedAt))}</p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Pelanggan",
      sortValue: (r) => r.customer?.fullName ?? "",
      cell: (r) => (
        <div className="max-w-52">
          <p className="truncate font-medium text-text-strong">{r.customer?.fullName}</p>
          <p className="text-xs text-text-subtle">{r.booking.code}</p>
        </div>
      ),
    },
    {
      key: "trip",
      header: "Perjalanan",
      wide: true,
      sortValue: (r) => r.departure?.startDate ?? "",
      cell: (r) => (
        <div className="max-w-52">
          <p className="truncate">{r.pkg?.title}</p>
          <p className="text-xs text-text-subtle">{r.departure && formatDateRange(r.departure.startDate, r.departure.endDate)}</p>
        </div>
      ),
    },
    {
      key: "outstanding",
      header: "Tagihan",
      align: "right",
      sortValue: (r) => (r.status === "void" ? -1 : r.fin.outstanding),
      cell: (r) => (
        <div className="whitespace-nowrap">
          <p className="font-medium text-text-strong">{formatIDR(r.fin.total)}</p>
          <p className={cn("text-xs", r.fin.outstanding > 0 && r.status !== "void" ? "text-text-muted" : "text-text-subtle")}>
            {r.status === "void" ? "dibatalkan" : r.fin.outstanding > 0 ? `sisa ${formatIDR(r.fin.outstanding)}` : "lunas"}
          </p>
        </div>
      ),
    },
    {
      key: "due",
      header: "Jatuh tempo berikutnya",
      sortValue: (r) => r.nextDue?.installment.dueDate ?? "9999",
      cell: (r) =>
        r.nextDue ? (
          <div className="whitespace-nowrap">
            <p className={cn(r.nextDue.status === "overdue" && "font-semibold text-tone-danger")}>{formatDate(r.nextDue.installment.dueDate)}</p>
            <p className="text-xs text-text-subtle">
              {r.nextDue.installment.label} · {formatRelativeDay(r.nextDue.installment.dueDate, today)}
            </p>
          </div>
        ) : (
          <span className="text-text-subtle">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      cell: (r) => <StatusBadge tone={INVOICE_STATUS_TONE(r.status)}>{INVOICE_STATUS_LABEL(r.status)}</StatusBadge>,
    },
  ]

  return (
    <div>
      <PageHeader title="Invoice" description="Invoice terbit saat booking diverifikasi. Status dan sisa tagihan dihitung dari pembayaran terverifikasi." />
      <FilterBar
        active={Boolean(query.status || search.value)}
        onReset={() => {
          search.reset()
          setQuery({ q: null, status: null })
        }}
      >
        <SearchField value={search.value} onChange={search.setValue} placeholder="Cari nomor, booking, pelanggan…" />
        <FilterSelect label="Status invoice" value={query.status} onChange={(status) => setQuery({ status })} allLabel="Semua status" options={STATUS_OPTIONS} />
      </FilterBar>
      <DataTable
        rows={filtered}
        columns={columns}
        caption="Daftar invoice"
        getRowKey={(r) => r.invoice.id}
        getRowHref={(r) => `/dashboard/invoices/${r.invoice.id}`}
        defaultSort={{ key: "number", dir: "desc" }}
        empty={<EmptyState icon={Receipt} title="Tidak ada invoice yang cocok" description="Ubah filter atau kata kunci pencarian." />}
        renderCard={(r) => (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-text-strong">{r.customer?.fullName}</p>
                <p className="text-xs text-text-subtle">{r.invoice.number}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">{formatIDR(r.fin.total)}</p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-subtle">
              <StatusBadge tone={INVOICE_STATUS_TONE(r.status)}>{INVOICE_STATUS_LABEL(r.status)}</StatusBadge>
              {r.nextDue && `${r.nextDue.installment.label} ${formatDate(r.nextDue.installment.dueDate)}`}
            </div>
          </div>
        )}
      />
    </div>
  )
}
