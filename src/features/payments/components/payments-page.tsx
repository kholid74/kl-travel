"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Inbox, Plus, Undo2, Wallet } from "lucide-react"
import { addDays, hoursBetween, toDateOnlyWIB } from "@/lib/dates"
import { formatDate, formatDateTime, formatIDR, formatRemaining } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { PaymentMethod, PaymentRecordStatus } from "@/domain/entities"
import { CANCELLATION_REASON_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_RECORD_STATUS_LABEL } from "@/domain/labels"
import { useLive } from "@/hooks/use-live"
import { useQueryParams } from "@/hooks/use-query-params"
import { useUrlSearchInput } from "@/hooks/use-url-search-input"
import { actorName } from "@/components/dashboard/activity-timeline"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { FilterBar, FilterSelect, SearchField } from "@/components/dashboard/filters"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { PageHeader } from "@/components/dashboard/page-header"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { SectionCard } from "@/components/dashboard/section-card"
import { DemoNotice, SimulatedTag } from "@/components/shared/demo-notice"
import { EmptyState } from "@/components/shared/states"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { bookingRows, type BookingRow } from "@/services/queries/bookings"
import { matchesPaymentSearch, paymentRows, type PaymentRow } from "@/services/queries/payments"
import { PAYMENT_RECORD_TONE } from "../labels"
import { PaymentReviewDialog, verificationEffect } from "./payment-review-dialog"
import { RecordPaymentDialog } from "./record-payment-dialog"
import { RefundDialog } from "./refund-dialog"

const KEYS = ["tab", "q", "status", "arah", "metode"] as const
type Tab = "verifikasi" | "semua" | "refund"
const TABS: { value: Tab; label: string }[] = [
  { value: "verifikasi", label: "Perlu verifikasi" },
  { value: "semua", label: "Semua pembayaran" },
  { value: "refund", label: "Refund" },
]

const columns: Column<PaymentRow>[] = [
  {
    key: "code",
    header: "Pembayaran",
    sortValue: (r) => r.payment.paidAt,
    cell: (r) => (
      <div>
        <p className="font-semibold whitespace-nowrap text-text-strong">{r.payment.code}</p>
        <p className="text-xs whitespace-nowrap text-text-subtle">{formatDateTime(r.payment.paidAt)}</p>
      </div>
    ),
  },
  {
    key: "booking",
    header: "Booking",
    sortValue: (r) => r.customer?.fullName ?? "",
    cell: (r) => (
      <div className="max-w-56">
        {r.booking && (
          <Link href={`/dashboard/bookings/${r.booking.id}`} className="font-medium whitespace-nowrap text-text-strong hover:underline">
            {r.booking.code}
          </Link>
        )}
        <p className="truncate text-xs text-text-subtle">{r.customer?.fullName}</p>
      </div>
    ),
  },
  {
    key: "method",
    header: "Jenis",
    sortValue: (r) => r.payment.direction + r.payment.method,
    cell: (r) => <span className="whitespace-nowrap">{r.payment.direction === "refund" ? "Refund" : PAYMENT_METHOD_LABEL[r.payment.method]}</span>,
  },
  {
    key: "amount",
    header: "Nominal",
    align: "right",
    sortValue: (r) => (r.payment.direction === "refund" ? -r.payment.amount : r.payment.amount),
    cell: (r) => (
      <span className={cn("font-medium whitespace-nowrap", r.payment.direction === "refund" && "text-tone-danger")}>
        {r.payment.direction === "refund" ? "−" : ""}
        {formatIDR(r.payment.amount)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    sortValue: (r) => r.payment.status,
    cell: (r) => <StatusBadge tone={PAYMENT_RECORD_TONE[r.payment.status]}>{PAYMENT_RECORD_STATUS_LABEL[r.payment.status]}</StatusBadge>,
  },
  {
    key: "reference",
    header: "Referensi",
    wide: true,
    cell: (r) => <span className="text-text-muted">{r.payment.reference ?? (r.payment.rejectionReason ? `Ditolak: ${r.payment.rejectionReason}` : "—")}</span>,
  },
]

export function PaymentsPage() {
  const live = useLive()
  const [query, setQuery] = useQueryParams(KEYS)
  const search = useUrlSearchInput(query.q, (q) => setQuery({ q }))
  const [recording, setRecording] = useState(false)
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [refunding, setRefunding] = useState<string | null>(null)
  const tab: Tab = query.tab === "semua" || query.tab === "refund" ? query.tab : "verifikasi"

  const rows = useMemo(() => (live ? paymentRows(live.db, live.today) : []), [live])
  const queue = useMemo(
    () => rows.filter((r) => r.payment.status === "pending_verification").sort((a, b) => a.payment.paidAt.localeCompare(b.payment.paidAt)),
    [rows],
  )
  const refundsDue = useMemo(
    () => (live ? bookingRows(live.db, live.today).filter((r) => r.booking.status === "cancelled" && r.fin.refundRemaining > 0) : []),
    [live],
  )
  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (query.status && r.payment.status !== query.status) return false
        if (query.arah && r.payment.direction !== query.arah) return false
        if (query.metode && r.payment.method !== query.metode) return false
        return matchesPaymentSearch(r, search.value.trim())
      }),
    [rows, query.status, query.arah, query.metode, search.value],
  )

  if (!live) return <PageSkeleton />
  const { db, now, today } = live
  const monthAgo = addDays(today, -29)
  const received = rows.filter((r) => r.payment.status === "verified" && r.payment.direction === "in" && toDateOnlyWIB(r.payment.paidAt) >= monthAgo)
  const outstanding = bookingRows(db, today).reduce((sum, r) => sum + (r.booking.status === "awaiting_payment" || r.booking.status === "confirmed" ? r.fin.outstanding : 0), 0)
  const refundHistory = rows.filter((r) => r.payment.direction === "refund").sort((a, b) => b.payment.paidAt.localeCompare(a.payment.paidAt))
  const reviewRow = rows.find((r) => r.payment.id === reviewing) ?? null
  const refundRow = refundsDue.find((r) => r.booking.id === refunding) ?? null
  const counts: Record<Tab, number> = { verifikasi: queue.length, semua: rows.length, refund: refundsDue.length }

  return (
    <div>
      <PageHeader
        title="Pembayaran"
        meta={<SimulatedTag />}
        description="Pembayaran booking, verifikasi bukti transfer, dan refund. Status pembayaran booking dihitung ulang dari data ini."
        actions={
          <PermissionButton permission="payments.record" onClick={() => setRecording(true)}>
            <Plus aria-hidden="true" /> Catat pembayaran
          </PermissionButton>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Menunggu verifikasi" value={queue.length} hint={`${formatIDR(queue.reduce((s, r) => s + r.payment.amount, 0))} belum dihitung`} />
        <KpiCard label="Diterima 30 hari" value={formatIDR(received.reduce((s, r) => s + r.payment.amount, 0))} hint={`${received.length} pembayaran terverifikasi`} />
        <KpiCard label="Sisa tagihan aktif" value={formatIDR(outstanding)} hint={<Link href="/dashboard/invoices?status=belum-lunas" className="hover:underline">Lihat invoice belum lunas</Link>} />
        <KpiCard label="Refund tertunda" value={formatIDR(refundsDue.reduce((s, r) => s + r.fin.refundRemaining, 0))} hint={`${refundsDue.length} booking dibatalkan`} />
      </div>

      <div role="tablist" aria-label="Tampilan pembayaran" className="mb-4 flex gap-1 overflow-x-auto border-b border-line no-scrollbar">
        {TABS.map(({ value, label }) => {
          const selected = tab === value
          return (
            <button
              key={value}
              role="tab"
              aria-selected={selected}
              onClick={() => setQuery({ tab: value === "verifikasi" ? null : value })}
              className={cn(
                "-mb-px inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected ? "border-ocean-800 text-text-strong" : "border-transparent text-text-muted hover:text-text-strong",
              )}
            >
              {label}
              <span className={cn("rounded-full px-1.5 text-xs tabular-nums", selected ? "bg-ocean-800 text-white" : "bg-muted text-text-muted")}>{counts[value]}</span>
            </button>
          )
        })}
      </div>

      {tab === "verifikasi" && (
        <div className="grid grid-cols-1 gap-4">
          <DemoNotice>
            Simulasi: pelanggan menekan &ldquo;Saya sudah transfer&rdquo; di halaman konfirmasi booking, lalu finance mencocokkan dengan mutasi rekening. Tidak ada payment gateway.
          </DemoNotice>
          {queue.length === 0 ? (
            <div className="rounded-lg border border-line bg-card shadow-xs">
              <EmptyState icon={Inbox} title="Antrean verifikasi kosong" description="Semua pembayaran yang dilaporkan sudah diproses." />
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {queue.map((row) => {
                const effect = verificationEffect(row)
                const waited = hoursBetween(row.payment.paidAt, now)
                return (
                  <li key={row.payment.id} className="flex flex-col rounded-lg border border-line bg-card p-4 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-text-subtle">
                          {row.payment.code} · {row.payment.submittedBy.kind === "customer" ? "dari website" : `dicatat ${actorName({ actor: row.payment.submittedBy }, db.users)}`}
                        </p>
                        <p className="mt-0.5 truncate font-semibold text-text-strong">{row.customer?.fullName}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {row.booking?.code} · {row.pkg?.title}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-semibold text-text-strong tabular-nums">{formatIDR(row.payment.amount)}</p>
                        <p className="text-xs text-text-subtle">{PAYMENT_METHOD_LABEL[row.payment.method]}</p>
                      </div>
                    </div>
                    {effect && <p className={cn("mt-3 text-xs", effect.tone === "success" ? "text-tone-success" : "text-tone-warning")}>{effect.text}</p>}
                    <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                      <p className={cn("text-xs", waited > 24 ? "font-semibold text-tone-warning" : "text-text-subtle")}>Menunggu {formatRemaining(Math.max(waited, 0.1))}</p>
                      <Button size="sm" onClick={() => setReviewing(row.payment.id)}>
                        Tinjau
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {tab === "semua" && (
        <>
          <FilterBar
            active={Boolean(query.status || query.arah || query.metode || search.value)}
            onReset={() => {
              search.reset()
              setQuery({ q: null, status: null, arah: null, metode: null })
            }}
          >
            <SearchField value={search.value} onChange={search.setValue} placeholder="Cari kode, booking, pelanggan…" />
            <FilterSelect
              label="Status"
              value={query.status}
              onChange={(status) => setQuery({ status })}
              allLabel="Semua status"
              options={(Object.keys(PAYMENT_RECORD_STATUS_LABEL) as PaymentRecordStatus[]).map((s) => ({ value: s, label: PAYMENT_RECORD_STATUS_LABEL[s] }))}
            />
            <FilterSelect
              label="Arah"
              value={query.arah}
              onChange={(arah) => setQuery({ arah })}
              allLabel="Masuk & refund"
              options={[
                { value: "in", label: "Pembayaran masuk" },
                { value: "refund", label: "Refund" },
              ]}
            />
            <FilterSelect
              label="Metode"
              value={query.metode}
              onChange={(metode) => setQuery({ metode })}
              allLabel="Semua metode"
              options={(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => ({ value: m, label: PAYMENT_METHOD_LABEL[m] }))}
            />
          </FilterBar>
          <DataTable
            rows={filtered}
            columns={columns}
            caption="Daftar pembayaran"
            getRowKey={(r) => r.payment.id}
            getRowHref={(r) => (r.booking ? `/dashboard/bookings/${r.booking.id}` : "")}
            defaultSort={{ key: "code", dir: "desc" }}
            empty={<EmptyState icon={Wallet} title="Tidak ada pembayaran yang cocok" description="Ubah filter atau kata kunci pencarian." />}
            renderCard={(r) => (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-text-strong">{r.customer?.fullName}</p>
                    <p className="text-xs text-text-subtle">
                      {r.payment.code} · {r.booking?.code}
                    </p>
                  </div>
                  <p className={cn("shrink-0 text-sm font-semibold tabular-nums", r.payment.direction === "refund" && "text-tone-danger")}>
                    {r.payment.direction === "refund" ? "−" : ""}
                    {formatIDR(r.payment.amount)}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-subtle">
                  <StatusBadge tone={PAYMENT_RECORD_TONE[r.payment.status]}>{PAYMENT_RECORD_STATUS_LABEL[r.payment.status]}</StatusBadge>
                  {r.payment.direction === "refund" ? "Refund" : PAYMENT_METHOD_LABEL[r.payment.method]} · {formatDateTime(r.payment.paidAt)}
                </div>
              </div>
            )}
          />
        </>
      )}

      {tab === "refund" && (
        <div className="grid gap-6">
          <SectionCard title="Refund tertunda" description="Booking dibatalkan yang refund-nya belum ditransfer penuh. Nominal mengikuti kebijakan pembatalan paket." bodyClassName="p-0">
            {refundsDue.length === 0 ? (
              <EmptyState icon={Undo2} title="Tidak ada refund tertunda" description="Semua refund sudah ditransfer." />
            ) : (
              <ul className="divide-y divide-line">
                {refundsDue.map((r) => (
                  <RefundRow key={r.booking.id} row={r} onRefund={() => setRefunding(r.booking.id)} />
                ))}
              </ul>
            )}
          </SectionCard>
          <SectionCard title="Riwayat refund" bodyClassName="p-0">
            {refundHistory.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-foreground">Belum ada refund.</p>
            ) : (
              <ul className="divide-y divide-line">
                {refundHistory.map((r) => (
                  <li key={r.payment.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-text-strong">
                        {r.customer?.fullName} ·{" "}
                        {r.booking && (
                          <Link href={`/dashboard/bookings/${r.booking.id}`} className="hover:underline">
                            {r.booking.code}
                          </Link>
                        )}
                      </p>
                      <p className="text-xs text-text-subtle">
                        {r.payment.code} · {formatDateTime(r.payment.paidAt)}
                        {r.payment.reference && ` · ${r.payment.reference}`}
                      </p>
                    </div>
                    <p className="font-semibold text-tone-danger tabular-nums">−{formatIDR(r.payment.amount)}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      )}

      <RecordPaymentDialog open={recording} onOpenChange={setRecording} />
      <PaymentReviewDialog row={reviewRow} onOpenChange={(open) => !open && setReviewing(null)} users={db.users} bank={db.settings.payment.bankAccountDisplay} />
      <RefundDialog row={refundRow} onOpenChange={(open) => !open && setRefunding(null)} />
    </div>
  )
}

function RefundRow({ row, onRefund }: { row: BookingRow; onRefund: () => void }) {
  const cancellation = row.booking.cancellation
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-strong">
          {row.customer?.fullName} ·{" "}
          <Link href={`/dashboard/bookings/${row.booking.id}`} className="hover:underline">
            {row.booking.code}
          </Link>
        </p>
        <p className="text-xs text-text-subtle">
          {cancellation && `${CANCELLATION_REASON_LABEL[cancellation.reason]} · ${formatDate(toDateOnlyWIB(cancellation.at))}`}
          {row.fin.refunded > 0 && ` · sudah ditransfer ${formatIDR(row.fin.refunded)}`}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-right text-sm">
          <span className="block font-semibold text-text-strong tabular-nums">{formatIDR(row.fin.refundRemaining)}</span>
          <span className="text-xs text-text-subtle">dari {formatIDR(row.fin.refundDue)}</span>
        </p>
        <PermissionButton permission="payments.verify" size="sm" variant="secondary" onClick={onRefund}>
          Catat refund
        </PermissionButton>
      </div>
    </li>
  )
}
