/**
 * State changes shared by several use cases (approval, conversion, cancellation).
 * They read through the unit of work rather than getIndexes(), because they may run
 * after earlier mutations in the same transaction.
 */
import { toDateOnlyWIB } from "@/lib/dates"
import { formatIDR } from "@/lib/format"
import { createId } from "@/lib/ids"
import { DomainError } from "@/lib/result"
import type { Booking, BookingCancellation, CancellationReason, Invoice } from "@/domain/entities"
import { CANCELLATION_REASON_LABEL } from "@/domain/labels"
import { cancellationQuote, type CancellationQuote } from "@/domain/rules/cancellation"
import { buildInstallments } from "@/domain/rules/invoice-schedule"
import { bookingFinancials, type BookingFinancials } from "@/domain/rules/payment-status"
import { priceTotal } from "@/domain/rules/pricing"
import type { Actor, ID } from "@/domain/types/common"
import type { UnitOfWork } from "@/repositories"
import { logActivity } from "./activity-log"
import { nextCode } from "./codes"
import { cancelPrivateDepartureOf } from "./departure-cascade"

export function financialsOf(uow: UnitOfWork, booking: Booking): BookingFinancials {
  return bookingFinancials({
    booking,
    invoice: uow.invoices.find((i) => i.bookingId === booking.id)[0],
    payments: uow.payments.find((p) => p.bookingId === booking.id),
    today: toDateOnlyWIB(uow.now),
  })
}

/** Invoice with the payment schedule; the deposit is due when the hold expires (§6.4). */
export function issueInvoice(uow: UnitOfWork, booking: Booking): Invoice {
  if (!booking.holdExpiresAt) throw new DomainError("VALIDATION", "Booking belum memiliki batas waktu pembayaran.")
  const departure = uow.departures.require(booking.departureId)
  const pkg = uow.packages.require(booking.packageId)
  const invoice: Invoice = {
    id: createId("inv"),
    number: nextCode(uow, "invoice"),
    bookingId: booking.id,
    issuedAt: uow.now,
    lines: booking.lines.map((line) => ({ ...line })),
    discount: booking.discount,
    installments: buildInstallments({
      total: priceTotal(booking),
      depositPercent: pkg.paymentTerms.depositPercent,
      balanceDueDaysBefore: pkg.paymentTerms.balanceDueDaysBefore,
      departureStart: departure.startDate,
      today: toDateOnlyWIB(uow.now),
      depositDueDate: toDateOnlyWIB(booking.holdExpiresAt),
    }).map((draft) => ({ ...draft, id: createId("ins") })),
    createdAt: uow.now,
    updatedAt: uow.now,
  }
  return uow.invoices.insert(invoice)
}

/**
 * Cancels a booking with the package's cancellation policy, voids its invoice, releases
 * its seats, and cancels a private departure that existed only for it (§6.6).
 */
export function applyCancellation(
  uow: UnitOfWork,
  bookingId: ID,
  input: { reason: CancellationReason; actor: Actor; note?: string },
): CancellationQuote {
  const booking = uow.bookings.require(bookingId)
  const departure = uow.departures.require(booking.departureId)
  const pkg = uow.packages.require(booking.packageId)
  const fin = financialsOf(uow, booking)
  const quote = cancellationQuote({
    status: booking.status,
    reason: input.reason,
    total: fin.total,
    paidNet: fin.paidNet,
    departureStart: departure.startDate,
    today: toDateOnlyWIB(uow.now),
    policy: pkg.cancellationPolicy,
  })
  const cancellation: BookingCancellation = {
    at: uow.now,
    by: input.actor,
    reason: input.reason,
    note: input.note?.trim() || undefined,
    feeAmount: quote.fee,
    refundAmount: quote.refund,
  }
  uow.bookings.update(booking.id, { status: "cancelled", holdExpiresAt: undefined, cancellation, updatedAt: uow.now })
  const invoice = uow.invoices.find((i) => i.bookingId === booking.id)[0]
  if (invoice && !invoice.voidedAt) uow.invoices.update(invoice.id, { voidedAt: uow.now, updatedAt: uow.now })

  logActivity(uow, {
    actor: input.actor,
    subject: { type: "booking", id: booking.id },
    related: [{ type: "departure", id: departure.id }],
    action: "booking.cancelled",
    message:
      `Booking ${booking.code} dibatalkan (${CANCELLATION_REASON_LABEL[input.reason].toLowerCase()})` +
      (quote.waived ? ", tanpa biaya pembatalan" : `, biaya ${formatIDR(quote.fee)}`) +
      (quote.refund > 0 ? `, refund ${formatIDR(quote.refund)}` : ""),
    data: { fee: quote.fee, refund: quote.refund },
  })
  if (input.reason !== "departure_cancelled") {
    cancelPrivateDepartureOf(uow, { departureId: departure.id, reason: `booking ${booking.code} dibatalkan`, actor: input.actor })
  }
  return quote
}
