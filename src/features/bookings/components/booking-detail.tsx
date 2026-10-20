"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useMemo, useState } from "react"
import { BadgeCheck, CalendarClock, CheckCheck, ExternalLink, Plus, XCircle } from "lucide-react"
import { addHours, diffDays, hoursBetween, toDateOnlyWIB } from "@/lib/dates"
import { formatDate, formatDateRange, formatDateTime, formatIDR, formatPhone, formatRemaining } from "@/lib/format"
import { getIndexes } from "@/domain/indexes"
import {
  BOOKING_STATUS_LABEL,
  CANCELLATION_REASON_LABEL,
  CUSTOMER_STAGE_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  SOURCE_LABEL,
} from "@/domain/labels"
import { approveGuard, cancelGuard, completeGuard, extendHoldGuard, MAX_HOLD_EXTENSIONS, paymentGuard } from "@/domain/rules/booking-lifecycle"
import { customerStage } from "@/domain/rules/customer-identity"
import { buildInstallments } from "@/domain/rules/invoice-schedule"
import { bookingFinancials } from "@/domain/rules/payment-status"
import { missingTravelerFields } from "@/domain/rules/travelers"
import { useCommand } from "@/hooks/use-command"
import { useLive } from "@/hooks/use-live"
import { usePersona } from "@/hooks/use-persona"
import { ActivityTimeline, actorName } from "@/components/dashboard/activity-timeline"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { PageHeader } from "@/components/dashboard/page-header"
import { NotFoundPanel, PageSkeleton } from "@/components/dashboard/page-skeleton"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { DescriptionList, SectionCard } from "@/components/dashboard/section-card"
import { StatusBadge, TripTypeBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { bookingCommands } from "@/services/booking-admin-service"
import { RecordPaymentDialog } from "@/features/payments/components/record-payment-dialog"
import { BOOKING_STATUS_TONE, CUSTOMER_STAGE_TONE, PAYMENT_STATUS_TONE } from "../labels"
import { CancelBookingDialog } from "./cancel-booking-dialog"
import { TravelerEditor } from "./traveler-editor"

/** Must sit inside <Suspense>: the id is only known at request time. */
export function BookingDetailRoute() {
  const { id } = useParams<{ id: string }>()
  return <BookingDetail id={id} />
}

function BookingDetail({ id }: { id: string }) {
  const live = useLive()
  const { user } = usePersona()
  const [dialog, setDialog] = useState<"approve" | "cancel" | "complete" | null>(null)
  const [recording, setRecording] = useState(false)
  const userId = user?.id ?? ""

  const approve = useCommand(bookingCommands.approve, { success: (r) => `Invoice ${r.number} diterbitkan`, onSuccess: () => setDialog(null) })
  const extend = useCommand(bookingCommands.extendHold, { success: (r) => `Hold diperpanjang hingga ${formatDateTime(r.holdExpiresAt)}` })
  const complete = useCommand(bookingCommands.complete, { success: "Booking ditandai Selesai", onSuccess: () => setDialog(null) })

  const view = useMemo(() => {
    if (!live) return null
    const { db, today } = live
    const booking = db.bookings[id]
    if (!booking) return { booking: null } as const
    const idx = getIndexes(db)
    const invoice = idx.invoiceByBooking.get(booking.id)
    const payments = [...(idx.paymentsByBooking.get(booking.id) ?? [])].sort((a, b) => b.paidAt.localeCompare(a.paidAt))
    return {
      booking,
      customer: db.customers[booking.customerId],
      pkg: db.packages[booking.packageId],
      departure: db.departures[booking.departureId],
      inquiry: booking.inquiryId ? db.inquiries[booking.inquiryId] : undefined,
      travelers: [...(idx.bookingTravelersByBooking.get(booking.id) ?? [])]
        .sort((a, b) => Number(b.isLead) - Number(a.isLead))
        .map((bt) => db.travelers[bt.travelerId])
        .filter(Boolean),
      invoice,
      payments,
      fin: bookingFinancials({ booking, invoice, payments, today }),
      events: idx.activityBySubject.get(booking.id) ?? [],
      stage: customerStage(idx.bookingsByCustomer.get(booking.customerId) ?? []),
      checklistComplete: !!idx.checklistByDeparture.get(booking.departureId)?.items.every((item) => item.done),
    }
  }, [live, id])

  if (!live || !view) return <PageSkeleton variant="detail" />
  if (!view.booking) {
    return (
      <NotFoundPanel
        title="Booking tidak ditemukan"
        description="Booking ini tidak ada di data demo browser ini. Mungkin data demo sudah di-reset."
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard/bookings">Kembali ke daftar booking</Link>
          </Button>
        }
      />
    )
  }

  const { db, now, today } = live
  const { booking, customer, pkg, departure, inquiry, travelers, invoice, payments, fin, events, stage, checklistComplete } = view
  const pax = travelers.length
  const incomplete = travelers.filter((t) => missingTravelerFields(t).length > 0).length
  const holdHours = booking.holdExpiresAt ? hoursBetween(now, booking.holdExpiresAt) : 0
  const approveBlock = approveGuard(booking) ?? (holdHours <= 0 ? "Batas waktu verifikasi sudah lewat." : null)
  const extendBlock = extendHoldGuard(booking)
  const cancelBlock = cancelGuard(booking)
  const completeBlock = departure ? completeGuard({ booking, departure, financials: fin, checklistComplete, today }) : "Keberangkatan tidak ditemukan."
  const paymentBlock =
    paymentGuard(booking) ??
    (fin.outstanding === 0 ? "Booking sudah lunas." : fin.outstanding - fin.pendingVerificationAmount <= 0 ? "Sisa tagihan sedang menunggu verifikasi." : null)
  const preview =
    booking.status === "pending" && pkg && departure
      ? buildInstallments({
          total: fin.total,
          depositPercent: pkg.paymentTerms.depositPercent,
          balanceDueDaysBefore: pkg.paymentTerms.balanceDueDaysBefore,
          departureStart: departure.startDate,
          today,
          depositDueDate: toDateOnlyWIB(addHours(now, db.settings.booking.depositHoldHours)),
        })
      : null

  return (
    <div>
      <PageHeader
        back={{ href: "/dashboard/bookings", label: "Booking" }}
        title={booking.code}
        meta={
          <>
            <StatusBadge tone={BOOKING_STATUS_TONE[booking.status]}>{BOOKING_STATUS_LABEL[booking.status]}</StatusBadge>
            <StatusBadge tone={PAYMENT_STATUS_TONE[fin.status]}>{PAYMENT_STATUS_LABEL[fin.status]}</StatusBadge>
          </>
        }
        description={`Dibuat ${formatDateTime(booking.createdAt)} dari ${SOURCE_LABEL[booking.source]}${customer ? ` · ${customer.fullName}` : ""}`}
        actions={
          <>
            {booking.status === "pending" && (
              <PermissionButton permission="bookings.manage" disabledReason={approveBlock} onClick={() => setDialog("approve")}>
                <BadgeCheck aria-hidden="true" /> Verifikasi & terbitkan invoice
              </PermissionButton>
            )}
            {(booking.status === "pending" || booking.status === "awaiting_payment") && (
              <PermissionButton
                permission="bookings.manage"
                variant="secondary"
                disabledReason={extendBlock}
                onClick={() => extend.run(userId, booking.id)}
                disabled={extend.pending}
              >
                <CalendarClock aria-hidden="true" /> Perpanjang hold 24 jam
              </PermissionButton>
            )}
            {booking.status === "confirmed" && (
              <PermissionButton permission="bookings.manage" variant="secondary" disabledReason={completeBlock} onClick={() => setDialog("complete")}>
                <CheckCheck aria-hidden="true" /> Tandai selesai
              </PermissionButton>
            )}
            {!cancelBlock && (
              <PermissionButton permission="bookings.cancel" variant="ghost" className="text-tone-danger hover:bg-tone-danger-bg" onClick={() => setDialog("cancel")}>
                <XCircle aria-hidden="true" /> Batalkan
              </PermissionButton>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <SectionCard title="Perjalanan">
            <div className="grid gap-6 sm:grid-cols-2">
              <DescriptionList
                items={[
                  {
                    label: "Paket",
                    value: pkg ? (
                      <Link href={`/dashboard/packages/${pkg.id}`} className="hover:underline">
                        {pkg.title}
                      </Link>
                    ) : (
                      "—"
                    ),
                  },
                  { label: "Jenis", value: <TripTypeBadge type={booking.tripType} /> },
                  {
                    label: "Keberangkatan",
                    value: departure ? (
                      <Link href={`/dashboard/departures/${departure.id}`} className="hover:underline">
                        {formatDateRange(departure.startDate, departure.endDate)}
                        <span className="block text-xs font-normal text-text-subtle">
                          {departure.code}
                          {departure.kind === "private" && " · privat"}
                        </span>
                      </Link>
                    ) : (
                      "—"
                    ),
                  },
                ]}
              />
              <DescriptionList
                items={[
                  { label: "Peserta", value: `${pax} orang` },
                  { label: "Sumber", value: SOURCE_LABEL[booking.source] },
                  {
                    label: "Dari inquiry",
                    hidden: !inquiry,
                    value: inquiry && (
                      <Link href={`/dashboard/inquiries/${inquiry.id}`} className="hover:underline">
                        {inquiry.code}
                      </Link>
                    ),
                  },
                  {
                    label: "Berangkat",
                    hidden: !departure || booking.status === "cancelled" || booking.status === "completed",
                    value: departure && (diffDays(departure.startDate, today) > 0 ? `${diffDays(departure.startDate, today)} hari lagi` : "Sudah berjalan"),
                  },
                ]}
              />
            </div>
            {booking.specialRequests && (
              <p className="mt-5 rounded-md bg-sand-100 px-4 py-3 text-sm text-sand-800">
                <span className="font-semibold">Permintaan khusus:</span> {booking.specialRequests}
              </p>
            )}
          </SectionCard>

          <SectionCard
            id="peserta"
            title={`Peserta (${pax})`}
            description={incomplete > 0 ? `${incomplete} peserta belum lengkap untuk manifest.` : "Semua data peserta lengkap."}
            action={
              <TravelerEditor
                key={travelers.map((t) => t.updatedAt).join()}
                userId={userId}
                bookingId={booking.id}
                travelers={travelers}
                today={today}
                disabled={booking.status === "cancelled" ? "Booking sudah dibatalkan." : null}
              />
            }
            bodyClassName="p-0"
          >
            <ul className="divide-y divide-line">
              {travelers.map((traveler, index) => {
                const missing = missingTravelerFields(traveler)
                return (
                  <li key={traveler.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-strong">
                        {traveler.fullName ?? <span className="text-text-subtle italic">Nama belum diisi</span>}
                        {index === 0 && <span className="ml-2 text-xs font-normal text-text-subtle">utama</span>}
                      </p>
                      <p className="text-xs text-text-subtle">
                        {[
                          traveler.gender === "L" ? "Laki-laki" : traveler.gender === "P" ? "Perempuan" : null,
                          traveler.dateOfBirth ? `${Math.floor(diffDays(today, traveler.dateOfBirth) / 365.25)} tahun` : null,
                          traveler.dietaryNotes,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Belum ada detail"}
                      </p>
                    </div>
                    {missing.length === 0 ? (
                      <StatusBadge tone="success">Lengkap</StatusBadge>
                    ) : (
                      <span className="text-xs text-tone-warning">Kurang: {missing.join(", ").toLowerCase()}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </SectionCard>

          <SectionCard
            title="Pembayaran"
            description={
              invoice ? (
                <>
                  Invoice{" "}
                  <Link href={`/dashboard/invoices/${invoice.id}`} className="font-medium text-text-strong hover:underline">
                    {invoice.number}
                  </Link>
                  {invoice.voidedAt ? " (dibatalkan)" : ""} · diterbitkan {formatDate(toDateOnlyWIB(invoice.issuedAt))}
                </>
              ) : (
                "Invoice terbit setelah booking diverifikasi."
              )
            }
            action={
              booking.status === "cancelled" ? undefined : (
                <PermissionButton permission="payments.record" size="sm" variant="secondary" disabledReason={paymentBlock} onClick={() => setRecording(true)}>
                  <Plus aria-hidden="true" /> Catat pembayaran
                </PermissionButton>
              )
            }
          >
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Total", value: formatIDR(fin.total) },
                { label: "Diterima", value: formatIDR(fin.paidNet) },
                { label: "Sisa tagihan", value: formatIDR(fin.outstanding) },
                { label: booking.status === "cancelled" ? "Refund tertunda" : "Menunggu verifikasi", value: formatIDR(booking.status === "cancelled" ? fin.refundRemaining : fin.pendingVerificationAmount) },
              ].map((item) => (
                <div key={item.label} className="rounded-md bg-canvas px-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">{item.label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-text-strong tabular-nums">{item.value}</dd>
                </div>
              ))}
            </dl>

            {(invoice?.installments.length || preview) && (
              <table className="mt-5 w-full text-table">
                <caption className="mb-2 text-left text-xs font-semibold text-text-muted">{invoice ? "Jadwal termin" : "Jadwal termin setelah verifikasi (perkiraan)"}</caption>
                <thead>
                  <tr className="border-b border-line text-left text-xs text-text-muted">
                    <th className="py-2 font-medium">Termin</th>
                    <th className="py-2 font-medium">Jatuh tempo</th>
                    <th className="py-2 text-right font-medium">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice?.installments ?? preview ?? []).map((installment) => {
                    const late = invoice && fin.nextInstallment?.installment.dueDate === installment.dueDate && installment.dueDate < today
                    return (
                      <tr key={installment.label} className="border-b border-line last:border-0">
                        <td className="py-2">{installment.label}</td>
                        <td className={late ? "py-2 font-semibold text-tone-danger" : "py-2"}>{formatDate(installment.dueDate)}</td>
                        <td className="py-2 text-right tabular-nums">{formatIDR(installment.amount)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            <h3 className="mt-6 text-xs font-semibold text-text-muted">Riwayat pembayaran</h3>
            {payments.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Belum ada pembayaran.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line rounded-md border border-line">
                {payments.map((payment) => (
                  <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-text-strong">
                        {payment.direction === "refund" ? "Refund" : PAYMENT_METHOD_LABEL[payment.method]} · {formatIDR(payment.amount)}
                      </p>
                      <p className="text-xs text-text-subtle">
                        {payment.code} · {formatDateTime(payment.paidAt)}
                        {payment.submittedBy.kind === "customer" && " · dikirim pelanggan"}
                      </p>
                    </div>
                    <StatusBadge tone={payment.status === "verified" ? "success" : payment.status === "rejected" ? "danger" : "info"}>
                      {payment.status === "verified" ? "Terverifikasi" : payment.status === "rejected" ? "Ditolak" : "Menunggu verifikasi"}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              {booking.status === "cancelled" && fin.refundRemaining > 0 ? "Refund dicatat tim finance di " : "Pembayaran yang dilaporkan pelanggan diverifikasi tim finance di "}
              <Link href={booking.status === "cancelled" ? "/dashboard/payments?tab=refund" : "/dashboard/payments"} className="font-semibold text-lagoon-700 hover:underline">
                modul Pembayaran
              </Link>
              . Semua pembayaran di showcase ini adalah simulasi.
            </p>
          </SectionCard>

          <SectionCard title="Timeline">
            <ActivityTimeline events={events} users={db.users} />
          </SectionCard>
        </div>

        <aside className="min-w-0 space-y-6">
          {customer && (
            <SectionCard
              title="Pelanggan"
              action={<StatusBadge tone={CUSTOMER_STAGE_TONE[stage]}>{CUSTOMER_STAGE_LABEL[stage]}</StatusBadge>}
            >
              <Link href={`/dashboard/customers/${customer.id}`} className="text-sm font-semibold text-text-strong hover:underline">
                {customer.fullName}
              </Link>
              <p className="text-xs text-text-subtle">{customer.code}</p>
              <DescriptionList
                className="mt-4"
                stacked
                items={[
                  { label: "Telepon", value: formatPhone(customer.phone) },
                  { label: "Email", value: customer.email ?? "—" },
                  { label: "Kota", value: customer.city ?? "—" },
                  { label: "Kontak via", value: customer.preferredContact === "whatsapp" ? "WhatsApp" : customer.preferredContact === "email" ? "Email" : "Telepon" },
                ]}
              />
            </SectionCard>
          )}

          {(booking.status === "pending" || booking.status === "awaiting_payment") && booking.holdExpiresAt && (
            <SectionCard title={booking.status === "pending" ? "Batas verifikasi" : "Batas pembayaran DP"}>
              <p className={holdHours < 6 ? "text-lg font-semibold text-tone-danger" : "text-lg font-semibold text-text-strong"}>
                {holdHours > 0 ? formatRemaining(holdHours) : "Sudah lewat"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Kursi ditahan hingga {formatDateTime(booking.holdExpiresAt)}. Lewat dari itu, sistem membatalkan booking dan melepas {pax} kursi.
              </p>
              <p className="mt-2 text-xs text-text-subtle">
                Diperpanjang {booking.holdExtensions ?? 0} dari {MAX_HOLD_EXTENSIONS} kali.
              </p>
            </SectionCard>
          )}

          {booking.cancellation && (
            <SectionCard title="Pembatalan">
              <DescriptionList
                items={[
                  { label: "Alasan", value: CANCELLATION_REASON_LABEL[booking.cancellation.reason] },
                  { label: "Waktu", value: formatDateTime(booking.cancellation.at) },
                  { label: "Oleh", value: actorName({ actor: booking.cancellation.by }, db.users) },
                  { label: "Biaya", value: formatIDR(booking.cancellation.feeAmount) },
                  { label: "Refund", value: formatIDR(booking.cancellation.refundAmount) },
                  { label: "Catatan", value: booking.cancellation.note, hidden: !booking.cancellation.note },
                ]}
              />
            </SectionCard>
          )}

          <SectionCard title="Rincian harga">
            <ul className="space-y-2 text-sm">
              {booking.lines.map((line) => (
                <li key={line.id} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    {line.label} × {line.quantity}
                  </span>
                  <span className="shrink-0 tabular-nums">{formatIDR(line.quantity * line.unitPrice)}</span>
                </li>
              ))}
              {booking.discount > 0 && (
                <li className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Diskon</span>
                  <span className="tabular-nums">−{formatIDR(booking.discount)}</span>
                </li>
              )}
            </ul>
            <p className="mt-3 flex justify-between border-t border-line pt-3 text-sm font-semibold">
              Total <span className="tabular-nums">{formatIDR(fin.total)}</span>
            </p>
          </SectionCard>

          {pkg && pkg.visibility === "catalog" && (
            <Link href={`/konfirmasi/booking/${booking.code}`} target="_blank" className="inline-flex items-center gap-1.5 text-xs font-semibold text-lagoon-700 hover:underline">
              Lihat halaman status untuk pelanggan <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={dialog === "approve"}
        onOpenChange={(open) => setDialog(open ? "approve" : null)}
        title="Verifikasi booking dan terbitkan invoice?"
        description={`Pastikan ${pax} kursi tersedia dan data pemesan sesuai. Pelanggan mendapat batas waktu ${db.settings.booking.depositHoldHours} jam untuk membayar termin pertama.`}
        confirmLabel="Verifikasi & terbitkan"
        pending={approve.pending}
        onConfirm={() => approve.run(userId, booking.id)}
      >
        {preview && (
          <ul className="space-y-1 rounded-md bg-muted px-4 py-3 text-sm">
            {preview.map((installment) => (
              <li key={installment.label} className="flex justify-between gap-3">
                <span>
                  {installment.label} · {formatDate(installment.dueDate)}
                </span>
                <span className="font-medium tabular-nums">{formatIDR(installment.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "complete"}
        onOpenChange={(open) => setDialog(open ? "complete" : null)}
        title="Tandai booking selesai?"
        description="Trip sudah berakhir dan pembayaran lunas. Booking selesai dihitung dalam riwayat dan tahap pelanggan."
        confirmLabel="Tandai selesai"
        pending={complete.pending}
        onConfirm={() => complete.run(userId, booking.id)}
      />

      <RecordPaymentDialog open={recording} onOpenChange={setRecording} bookingId={booking.id} />

      {pkg && departure && (
        <CancelBookingDialog
          open={dialog === "cancel"}
          onOpenChange={(open) => setDialog(open ? "cancel" : null)}
          userId={userId}
          booking={booking}
          departure={departure}
          pkg={pkg}
          fin={fin}
          today={today}
        />
      )}
    </div>
  )
}
