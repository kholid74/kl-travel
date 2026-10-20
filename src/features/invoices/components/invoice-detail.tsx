"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useMemo, useState } from "react"
import { Plus, Printer } from "lucide-react"
import { formatDateTime, formatIDR } from "@/lib/format"
import { getIndexes } from "@/domain/indexes"
import { PAYMENT_METHOD_LABEL, PAYMENT_RECORD_STATUS_LABEL } from "@/domain/labels"
import { useLive } from "@/hooks/use-live"
import { PageHeader } from "@/components/dashboard/page-header"
import { NotFoundPanel, PageSkeleton } from "@/components/dashboard/page-skeleton"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { SectionCard } from "@/components/dashboard/section-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { PAYMENT_RECORD_TONE } from "@/features/payments/labels"
import { RecordPaymentDialog } from "@/features/payments/components/record-payment-dialog"
import { invoiceView } from "@/services/queries/invoices"
import { InvoiceDocument } from "./invoice-document"
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_TONE } from "./invoice-list"

/** Must sit inside <Suspense>: the id is only known at request time. */
export function InvoiceDetailRoute() {
  const { id } = useParams<{ id: string }>()
  return <InvoiceDetail id={id} />
}

function InvoiceDetail({ id }: { id: string }) {
  const live = useLive()
  const [recording, setRecording] = useState(false)
  const view = useMemo(() => (live ? invoiceView(live.db, id, live.today) : undefined), [live, id])

  if (!live || view === undefined) return <PageSkeleton variant="detail" />
  if (!view) {
    return (
      <NotFoundPanel
        title="Invoice tidak ditemukan"
        description="Invoice ini tidak ada di data demo browser ini. Mungkin data demo sudah di-reset."
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard/invoices">Kembali ke daftar invoice</Link>
          </Button>
        }
      />
    )
  }

  const { db } = live
  const { invoice, booking, customer, fin, payments } = view
  const pax = getIndexes(db).paxOf(booking.id)
  const recordBlock = invoice.voidedAt
    ? "Invoice sudah dibatalkan."
    : fin.outstanding - fin.pendingVerificationAmount <= 0
      ? fin.outstanding === 0
        ? "Invoice sudah lunas."
        : "Sisa tagihan sedang menunggu verifikasi."
      : null

  return (
    <div>
      <PageHeader
        back={{ href: "/dashboard/invoices", label: "Invoice" }}
        title={invoice.number}
        meta={<StatusBadge tone={INVOICE_STATUS_TONE(view.status)}>{INVOICE_STATUS_LABEL(view.status)}</StatusBadge>}
        description={`${customer?.fullName ?? ""} · booking ${booking.code}`}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href={`/print/invoices/${invoice.id}`} target="_blank">
                <Printer aria-hidden="true" /> Cetak / PDF
              </Link>
            </Button>
            <PermissionButton permission="payments.record" disabledReason={recordBlock} onClick={() => setRecording(true)}>
              <Plus aria-hidden="true" /> Catat pembayaran
            </PermissionButton>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 rounded-lg border border-line bg-white p-5 shadow-xs md:p-8 lg:col-span-2">
          <InvoiceDocument view={view} settings={db.settings} pax={pax} />
        </div>
        <aside className="min-w-0 space-y-6">
          <SectionCard title="Booking">
            <Link href={`/dashboard/bookings/${booking.id}`} className="text-sm font-semibold text-text-strong hover:underline">
              {booking.code}
            </Link>
            {customer && (
              <p className="text-sm text-muted-foreground">
                <Link href={`/dashboard/customers/${customer.id}`} className="hover:underline">
                  {customer.fullName}
                </Link>
              </p>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Diterima</dt>
              <dd className="text-right font-medium tabular-nums">{formatIDR(fin.paidNet)}</dd>
              <dt className="text-muted-foreground">Menunggu verifikasi</dt>
              <dd className="text-right font-medium tabular-nums">{formatIDR(fin.pendingVerificationAmount)}</dd>
              <dt className="text-muted-foreground">Sisa tagihan</dt>
              <dd className="text-right font-semibold tabular-nums">{formatIDR(fin.outstanding)}</dd>
            </dl>
          </SectionCard>
          <SectionCard title="Semua pembayaran" description="Termasuk yang masih menunggu verifikasi atau ditolak." bodyClassName="p-0">
            {payments.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-foreground">Belum ada pembayaran.</p>
            ) : (
              <ul className="divide-y divide-line">
                {payments.map((p) => (
                  <li key={p.id} className="px-5 py-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-text-strong tabular-nums">
                        {p.direction === "refund" ? "Refund −" : ""}
                        {formatIDR(p.amount)}
                      </p>
                      <StatusBadge tone={PAYMENT_RECORD_TONE[p.status]}>{PAYMENT_RECORD_STATUS_LABEL[p.status]}</StatusBadge>
                    </div>
                    <p className="text-xs text-text-subtle">
                      {p.code} · {p.direction === "refund" ? "Transfer bank" : PAYMENT_METHOD_LABEL[p.method]} · {formatDateTime(p.paidAt)}
                    </p>
                    {p.rejectionReason && <p className="mt-1 text-xs text-tone-danger">Ditolak: {p.rejectionReason}</p>}
                  </li>
                ))}
              </ul>
            )}
            {view.status !== "void" && fin.hasPendingVerification && (
              <p className="border-t border-line px-5 py-3 text-xs">
                <Link href="/dashboard/payments" className="font-semibold text-lagoon-700 hover:underline">
                  Buka antrean verifikasi
                </Link>
              </p>
            )}
          </SectionCard>
        </aside>
      </div>

      <RecordPaymentDialog open={recording} onOpenChange={setRecording} bookingId={booking.id} />
    </div>
  )
}
