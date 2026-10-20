"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useMemo, useState } from "react"
import { Check, CheckCircle2, Clock, Copy, LayoutDashboard, Landmark, XCircle } from "lucide-react"
import { hoursBetween, toDateOnlyWIB } from "@/lib/dates"
import { formatDate, formatDateRange, formatDateTime, formatIDR, formatPhone, formatRemaining } from "@/lib/format"
import { cn } from "@/lib/utils"
import { getIndexes } from "@/domain/indexes"
import { BOOKING_STATUS_LABEL, CANCELLATION_REASON_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/domain/labels"
import { bookingFinancials } from "@/domain/rules/payment-status"
import { priceTotal } from "@/domain/rules/pricing"
import { isTravelerComplete } from "@/domain/rules/travelers"
import { useNow } from "@/hooks/use-now"
import { ConfirmationSkeleton } from "@/components/public/flow-shell"
import { NotFoundState } from "@/components/public/not-found-state"
import { SimulatedTag } from "@/components/shared/demo-notice"
import { StatusBadge } from "@/components/shared/status-badge"
import { useDatabase } from "@/stores/db-store"
import { BOOKING_STATUS_TONE, PAYMENT_STATUS_TONE } from "../labels"
import { PaymentConfirmationDialog } from "./payment-confirmation-dialog"

/** Must sit inside <Suspense>: the code is only known at request time. */
export function BookingConfirmationRoute() {
  const { code } = useParams<{ code: string }>()
  return <BookingConfirmation code={decodeURIComponent(code)} />
}

function BookingConfirmation({ code }: { code: string }) {
  const { db, ready } = useDatabase()
  const now = useNow()

  const view = useMemo(() => {
    if (!db || !now) return null
    const booking = Object.values(db.bookings).find((b) => b.code === code)
    if (!booking) return { booking: null } as const
    const idx = getIndexes(db)
    const invoice = idx.invoiceByBooking.get(booking.id)
    const payments = (idx.paymentsByBooking.get(booking.id) ?? []).filter((p) => p.direction === "in")
    const travelers = [...(idx.bookingTravelersByBooking.get(booking.id) ?? [])]
      .sort((a, b) => Number(b.isLead) - Number(a.isLead))
      .map((bt) => db.travelers[bt.travelerId])
      .filter(Boolean)
    return {
      booking,
      pkg: db.packages[booking.packageId],
      departure: db.departures[booking.departureId],
      destination: db.destinations[db.packages[booking.packageId]?.destinationId],
      customer: db.customers[booking.customerId],
      invoice,
      payments,
      travelers,
      settings: db.settings,
      fin: bookingFinancials({ booking, invoice, payments: idx.paymentsByBooking.get(booking.id) ?? [], today: toDateOnlyWIB(now) }),
    }
  }, [db, now, code])

  if (!ready || !view) return <ConfirmationSkeleton />
  if (!view.booking) {
    return (
      <NotFoundState
        title="Booking tidak ditemukan"
        description="Data demo hanya tersimpan di browser tempat booking dibuat. Booking tidak akan ditemukan bila tautan dibuka di perangkat lain atau data demo sudah di-reset."
        backHref="/paket"
        backLabel="Lihat paket"
      />
    )
  }

  const { booking, pkg, departure, destination, customer, invoice, payments, travelers, settings, fin } = view
  const remainingHours = booking.holdExpiresAt && now ? hoursBetween(now, booking.holdExpiresAt) : 0
  const pendingPayments = payments.filter((p) => p.status === "pending_verification")
  const payable = fin.outstanding - fin.pendingVerificationAmount
  const canPay = (booking.status === "awaiting_payment" || booking.status === "confirmed") && payable > 0
  const total = priceTotal(booking)
  const incomplete = travelers.filter((t) => !isTravelerComplete(t)).length

  const headline = {
    pending: { icon: Clock, title: "Pemesanan diterima", body: "Kursi Anda sudah ditahan. Tim kami memverifikasi ketersediaan lalu mengirim invoice melalui WhatsApp (simulasi)." },
    awaiting_payment: {
      icon: Landmark,
      title: fin.hasPendingVerification ? "Pembayaran sedang diverifikasi" : "Menunggu pembayaran",
      body: fin.hasPendingVerification
        ? "Terima kasih. Tim finance sedang memeriksa konfirmasi pembayaran Anda."
        : "Pemesanan sudah diverifikasi. Selesaikan pembayaran pertama agar kursi Anda terkonfirmasi.",
    },
    confirmed: { icon: CheckCircle2, title: "Booking terkonfirmasi", body: "Kursi Anda sudah aman. Briefing perjalanan dikirim menjelang keberangkatan." },
    completed: { icon: CheckCircle2, title: "Trip selesai", body: "Terima kasih sudah bepergian bersama kami." },
    cancelled: {
      icon: XCircle,
      title: "Booking dibatalkan",
      body: booking.cancellation ? `Alasan: ${CANCELLATION_REASON_LABEL[booking.cancellation.reason].toLowerCase()}.` : "Booking ini sudah dibatalkan.",
    },
  }[booking.status]
  const Icon = headline.icon

  const milestones = [
    { label: "Pemesanan diterima", done: true },
    { label: "Diverifikasi & invoice terbit", done: !!invoice },
    { label: "Pembayaran pertama diterima", done: booking.status === "confirmed" || booking.status === "completed" },
    { label: "Berangkat", done: booking.status === "completed" },
  ]

  return (
    <div className="container-page max-w-5xl pt-10 pb-24 md:pt-14">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge tone={BOOKING_STATUS_TONE[booking.status]}>{BOOKING_STATUS_LABEL[booking.status]}</StatusBadge>
        <CopyCode code={booking.code} />
      </div>
      <div className="mt-5 flex items-start gap-4">
        <Icon className={cn("mt-2 size-8 shrink-0", booking.status === "cancelled" ? "text-tone-danger" : "text-lagoon-700")} strokeWidth={1.5} aria-hidden="true" />
        <div>
          <h1 className="font-display text-display-md text-balance text-ocean-900">{headline.title}</h1>
          <p className="mt-2 max-w-2xl text-body-lg text-muted-foreground">{headline.body}</p>
        </div>
      </div>

      {booking.status !== "cancelled" && (
        <ol className="mt-10 grid gap-3 sm:grid-cols-4" aria-label="Progres booking">
          {milestones.map((milestone, index) => (
            <li key={milestone.label} className={cn("border-t-2 pt-3 text-sm", milestone.done ? "border-lagoon-600" : "border-border")}>
              <span className={cn("flex items-center gap-1.5 font-medium", milestone.done ? "text-foreground" : "text-muted-foreground")}>
                {milestone.done ? <Check className="size-4 text-lagoon-700" aria-hidden="true" /> : <span className="tabular-nums">{index + 1}.</span>}
                {milestone.label}
              </span>
              <span className="sr-only">{milestone.done ? "selesai" : "belum"}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-12">
        <div className="min-w-0 space-y-8 lg:col-span-7">
          {booking.status === "pending" && booking.holdExpiresAt && (
            <section className="rounded-[4px] border border-border bg-card p-5 sm:p-6">
              <h2 className="text-base font-semibold text-ocean-900">Kursi ditahan sementara</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Hingga <strong className="text-foreground">{formatDateTime(booking.holdExpiresAt)}</strong>
                {remainingHours > 0 && <> · sisa {formatRemaining(remainingHours)}</>}. Bila belum diverifikasi sampai batas itu, kursi dilepas
                otomatis.
              </p>
            </section>
          )}

          {invoice && booking.status !== "cancelled" && (
            <section aria-labelledby="pembayaran" className="rounded-[4px] border border-border bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="pembayaran" className="text-base font-semibold text-ocean-900">
                  Pembayaran
                </h2>
                <StatusBadge tone={PAYMENT_STATUS_TONE[fin.status]}>{PAYMENT_STATUS_LABEL[fin.status]}</StatusBadge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Invoice {invoice.number}</p>
              <table className="mt-5 w-full text-sm">
                <caption className="sr-only">Jadwal pembayaran</caption>
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th scope="col" className="pb-2 font-medium">Termin</th>
                    <th scope="col" className="pb-2 font-medium">Jatuh tempo</th>
                    <th scope="col" className="pb-2 text-right font-medium">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.installments.map((installment) => {
                    const covered = fin.nextInstallment ? installment.dueDate < fin.nextInstallment.installment.dueDate : fin.status === "paid"
                    return (
                      <tr key={installment.id} className="border-b border-border last:border-0">
                        <th scope="row" className="py-2.5 text-left font-medium">
                          {installment.label}
                          {covered && <span className="ml-2 text-xs font-normal text-tone-success">Lunas</span>}
                        </th>
                        <td className="py-2.5 text-muted-foreground">{formatDate(installment.dueDate)}</td>
                        <td className="py-2.5 text-right font-medium tabular-nums">{formatIDR(installment.amount)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <dl className="mt-4 grid grid-cols-2 gap-y-1.5 border-t border-border pt-4 text-sm">
                <dt className="text-muted-foreground">Sudah diterima</dt>
                <dd className="text-right font-medium tabular-nums">{formatIDR(fin.paidNet)}</dd>
                <dt className="text-muted-foreground">Sisa tagihan</dt>
                <dd className="text-right font-semibold tabular-nums">{formatIDR(fin.outstanding)}</dd>
              </dl>

              {pendingPayments.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {pendingPayments.map((payment) => (
                    <li key={payment.id} className="flex items-center justify-between gap-3 rounded-md bg-tone-info-bg px-3 py-2 text-xs text-tone-info">
                      <span>
                        {PAYMENT_METHOD_LABEL[payment.method]} {formatIDR(payment.amount)} · {formatDateTime(payment.paidAt)}
                      </span>
                      <span className="font-semibold">Menunggu verifikasi</span>
                    </li>
                  ))}
                </ul>
              )}

              {canPay && (
                <div className="mt-6 rounded-md bg-muted p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    Transfer ke rekening <SimulatedTag />
                  </p>
                  <p className="mt-2 text-sm">
                    {settings.payment.bankAccountDisplay.bank} · <span className="font-semibold tabular-nums">{settings.payment.bankAccountDisplay.number}</span>
                    <span className="block text-muted-foreground">a.n. {settings.payment.bankAccountDisplay.holder}</span>
                  </p>
                  {fin.nextInstallment && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Berikutnya: {fin.nextInstallment.installment.label} {formatIDR(fin.nextInstallment.remaining)}
                      {booking.status === "awaiting_payment" && booking.holdExpiresAt && <> sebelum {formatDateTime(booking.holdExpiresAt)}</>}
                    </p>
                  )}
                  <div className="mt-4">
                    <PaymentConfirmationDialog
                      bookingId={booking.id}
                      suggestedAmount={Math.min(payable, fin.nextInstallment?.remaining ?? payable)}
                      maxAmount={payable}
                      defaultSender={customer?.fullName ?? ""}
                    />
                  </div>
                </div>
              )}
            </section>
          )}

          <section aria-labelledby="detail-trip" className="rounded-[4px] border border-border bg-card p-5 sm:p-6">
            <h2 id="detail-trip" className="text-base font-semibold text-ocean-900">
              Detail perjalanan
            </h2>
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[140px_1fr]">
              <dt className="text-muted-foreground">Paket</dt>
              <dd className="font-medium">
                {pkg ? (
                  <Link href={`/paket/${pkg.slug}`} className="underline-offset-4 hover:underline">
                    {pkg.title}
                  </Link>
                ) : (
                  "—"
                )}
                {destination && <span className="block text-muted-foreground">{destination.name}</span>}
              </dd>
              <dt className="text-muted-foreground">Tanggal</dt>
              <dd className="font-medium">{departure ? formatDateRange(departure.startDate, departure.endDate) : "—"}</dd>
              {pkg?.meetingPoint && (
                <>
                  <dt className="text-muted-foreground">Titik kumpul</dt>
                  <dd>
                    {pkg.meetingPoint.name}
                    {pkg.meetingPoint.time && <span className="text-muted-foreground"> · {pkg.meetingPoint.time}</span>}
                  </dd>
                </>
              )}
              <dt className="text-muted-foreground">Peserta</dt>
              <dd>
                <ol className="list-decimal space-y-0.5 pl-5">
                  {travelers.map((traveler) => (
                    <li key={traveler.id}>
                      {traveler.fullName ?? "Belum diisi"}
                      {!isTravelerComplete(traveler) && <span className="ml-1.5 text-xs text-tone-warning">data belum lengkap</span>}
                    </li>
                  ))}
                </ol>
                {incomplete > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">Tim kami akan menghubungi Anda untuk melengkapi data peserta sebelum manifest final.</p>
                )}
              </dd>
              {customer && (
                <>
                  <dt className="text-muted-foreground">Pemesan</dt>
                  <dd>
                    {customer.fullName}
                    <span className="block text-muted-foreground">
                      {formatPhone(customer.phone)}
                      {customer.email && ` · ${customer.email}`}
                    </span>
                  </dd>
                </>
              )}
              {booking.specialRequests && (
                <>
                  <dt className="text-muted-foreground">Permintaan khusus</dt>
                  <dd>{booking.specialRequests}</dd>
                </>
              )}
            </dl>
          </section>
        </div>

        <aside className="min-w-0 space-y-6 lg:col-span-5">
          <section aria-labelledby="rincian-harga" className="rounded-[4px] border border-border bg-card p-5 sm:p-6">
            <h2 id="rincian-harga" className="text-base font-semibold text-ocean-900">
              Rincian harga
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {booking.lines.map((line) => (
                <li key={line.id} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    {line.label} × {line.quantity}
                  </span>
                  <span className="font-medium tabular-nums">{formatIDR(line.unitPrice * line.quantity)}</span>
                </li>
              ))}
              {booking.discount > 0 && (
                <li className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Diskon</span>
                  <span className="font-medium tabular-nums">−{formatIDR(booking.discount)}</span>
                </li>
              )}
            </ul>
            <p className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-semibold text-ocean-900 tabular-nums">{formatIDR(total)}</span>
            </p>
          </section>

          <section className="rounded-[4px] bg-ocean-900 p-6 text-ivory-50">
            <p className="eyebrow text-sand-300">Lanjutkan demo</p>
            <p className="mt-2 text-sm leading-relaxed text-ivory-50/85">
              Booking ini sudah masuk ke dashboard operasional. Buka dari sisi tim untuk memverifikasi, menerbitkan invoice, dan mencatat
              pembayaran.
            </p>
            <Link
              href={`/dashboard/bookings/${booking.id}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sand-300 underline-offset-4 hover:underline"
            >
              <LayoutDashboard className="size-4" aria-hidden="true" /> Lihat booking di dashboard
            </Link>
          </section>
        </aside>
      </div>
    </div>
  )
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked; the code stays visible and selectable.
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold tabular-nums hover:bg-muted"
      aria-label={`Salin kode booking ${code}`}
    >
      {code}
      {copied ? <Check className="size-3.5 text-tone-success" aria-hidden="true" /> : <Copy className="size-3.5 text-muted-foreground" aria-hidden="true" />}
      <span aria-live="polite" className="sr-only">
        {copied ? "Kode disalin" : ""}
      </span>
    </button>
  )
}
