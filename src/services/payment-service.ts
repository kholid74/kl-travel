import { atWIB, toDateOnlyWIB, type DateOnly } from "@/lib/dates"
import { formatIDR } from "@/lib/format"
import { createId } from "@/lib/ids"
import { DomainError } from "@/lib/result"
import type { PaymentMethod } from "@/domain/entities"
import { PAYMENT_METHOD_LABEL } from "@/domain/labels"
import { paymentGuard } from "@/domain/rules/booking-lifecycle"
import type { ID } from "@/domain/types/common"
import type { UnitOfWork } from "@/repositories"
import { logActivity, SYSTEM_ACTOR } from "./activity-log"
import { requirePermission, userActor } from "./authz"
import { financialsOf } from "./booking-effects"
import { nextCode } from "./codes"
import { runCommand } from "./runtime"

/**
 * awaiting_payment → confirmed happens by itself once verified money covers the first
 * installment (docs/domain-model.md §5.1). Holds end because the seats are now allocated.
 */
function confirmIfDepositCovered(uow: UnitOfWork, bookingId: ID) {
  const booking = uow.bookings.require(bookingId)
  if (booking.status !== "awaiting_payment") return false
  const fin = financialsOf(uow, booking)
  if (fin.paidNet < fin.firstInstallmentAmount) return false
  uow.bookings.update(booking.id, { status: "confirmed", confirmedAt: uow.now, holdExpiresAt: undefined, updatedAt: uow.now })
  logActivity(uow, {
    actor: SYSTEM_ACTOR,
    subject: { type: "booking", id: booking.id },
    action: "booking.confirmed",
    message: `Booking ${booking.code} terkonfirmasi setelah ${fin.firstInstallmentAmount >= fin.total ? "pembayaran" : "DP"} diterima`,
  })
  return true
}

/** Finance accepts a payment that a customer or teammate reported. */
export function verifyPayment(uow: UnitOfWork, userId: ID, paymentId: ID) {
  requirePermission(uow, userId, "payments.verify")
  const payment = uow.payments.require(paymentId)
  if (payment.status !== "pending_verification") throw new DomainError("INVALID_TRANSITION", "Pembayaran ini sudah diproses.")
  const booking = uow.bookings.require(payment.bookingId)
  if (payment.direction === "in") {
    if (booking.status === "cancelled") throw new DomainError("INVALID_TRANSITION", "Booking sudah dibatalkan. Tolak pembayaran ini dan proses sebagai refund.")
    const guard = paymentGuard(booking)
    if (guard) throw new DomainError("INVALID_TRANSITION", guard)
    const fin = financialsOf(uow, booking)
    if (payment.amount > fin.outstanding) {
      throw new DomainError("VALIDATION", `Nominal ${formatIDR(payment.amount)} melebihi sisa tagihan ${formatIDR(fin.outstanding)}. Tolak lalu minta pelanggan mengonfirmasi ulang.`)
    }
  }
  uow.payments.update(payment.id, { status: "verified", verifiedAt: uow.now, verifiedBy: userId, updatedAt: uow.now })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "booking", id: booking.id },
    related: [{ type: "payment", id: payment.id }],
    action: "payment.verified",
    message: `Pembayaran ${payment.code} sebesar ${formatIDR(payment.amount)} diverifikasi`,
  })
  const confirmed = confirmIfDepositCovered(uow, booking.id)
  return { confirmed, bookingCode: booking.code }
}

export function rejectPayment(uow: UnitOfWork, userId: ID, paymentId: ID, reason: string) {
  requirePermission(uow, userId, "payments.verify")
  const payment = uow.payments.require(paymentId)
  if (payment.status !== "pending_verification") throw new DomainError("INVALID_TRANSITION", "Pembayaran ini sudah diproses.")
  if (!reason.trim()) throw new DomainError("VALIDATION", "Tuliskan alasan penolakan.", "reason")
  const booking = uow.bookings.require(payment.bookingId)
  uow.payments.update(payment.id, { status: "rejected", rejectionReason: reason.trim(), verifiedAt: uow.now, verifiedBy: userId, updatedAt: uow.now })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "booking", id: booking.id },
    related: [{ type: "payment", id: payment.id }],
    action: "payment.rejected",
    message: `Pembayaran ${payment.code} ditolak: ${reason.trim()}`,
  })
}

export interface RecordPaymentInput {
  bookingId: ID
  amount: number
  method: PaymentMethod
  paidOn: DateOnly
  reference?: string
  note?: string
}

/**
 * Payment entered by the team (transfer seen in the bank statement, cash at the office).
 * A persona who may verify records it as verified; otherwise it waits for finance.
 */
export function recordPayment(uow: UnitOfWork, userId: ID, input: RecordPaymentInput) {
  const user = requirePermission(uow, userId, "payments.record")
  const booking = uow.bookings.require(input.bookingId)
  const guard = paymentGuard(booking)
  if (guard) throw new DomainError("INVALID_TRANSITION", guard)
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new DomainError("VALIDATION", "Masukkan nominal pembayaran.", "amount")
  if (input.paidOn > toDateOnlyWIB(uow.now)) throw new DomainError("VALIDATION", "Tanggal bayar tidak boleh di masa depan.", "paidOn")
  const fin = financialsOf(uow, booking)
  const open = fin.outstanding - fin.pendingVerificationAmount
  if (input.amount > open) {
    throw new DomainError("VALIDATION", `Nominal melebihi sisa tagihan yang belum tercatat (${formatIDR(open)}).`, "amount")
  }
  const canVerify = !!uow.roles.get(user.roleId)?.permissions.includes("payments.verify")
  const invoice = uow.invoices.find((i) => i.bookingId === booking.id && !i.voidedAt)[0]
  const paymentId = createId("pay")
  const code = nextCode(uow, "payment")
  const paidAt = input.paidOn === toDateOnlyWIB(uow.now) ? uow.now : atWIB(input.paidOn, 10)
  uow.payments.insert({
    id: paymentId,
    code,
    bookingId: booking.id,
    invoiceId: invoice?.id,
    direction: "in",
    amount: input.amount,
    method: input.method,
    status: canVerify ? "verified" : "pending_verification",
    paidAt,
    reference: input.reference?.trim() || undefined,
    note: input.note?.trim() || undefined,
    submittedBy: userActor(userId),
    verifiedAt: canVerify ? uow.now : undefined,
    verifiedBy: canVerify ? userId : undefined,
    createdAt: uow.now,
    updatedAt: uow.now,
  })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "booking", id: booking.id },
    related: [{ type: "payment", id: paymentId }],
    action: "payment.recorded",
    message: `Pembayaran ${formatIDR(input.amount)} via ${PAYMENT_METHOD_LABEL[input.method].toLowerCase()} dicatat untuk booking ${booking.code}${canVerify ? "" : " (menunggu verifikasi finance)"}`,
  })
  const confirmed = canVerify ? confirmIfDepositCovered(uow, booking.id) : false
  return { paymentId, code, verified: canVerify, confirmed }
}

/** Money returned after a cancellation, up to the refund the policy allowed (§6.6). */
export function recordRefund(uow: UnitOfWork, userId: ID, input: { bookingId: ID; amount: number; reference?: string; note?: string }) {
  requirePermission(uow, userId, "payments.verify")
  const booking = uow.bookings.require(input.bookingId)
  if (booking.status !== "cancelled") throw new DomainError("INVALID_TRANSITION", "Refund hanya untuk booking yang dibatalkan.")
  const fin = financialsOf(uow, booking)
  if (fin.refundRemaining <= 0) throw new DomainError("CONFLICT", "Tidak ada sisa refund untuk booking ini.")
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new DomainError("VALIDATION", "Masukkan nominal refund.", "amount")
  if (input.amount > fin.refundRemaining) throw new DomainError("VALIDATION", `Maksimal ${formatIDR(fin.refundRemaining)}.`, "amount")
  const paymentId = createId("pay")
  const code = nextCode(uow, "payment")
  uow.payments.insert({
    id: paymentId,
    code,
    bookingId: booking.id,
    direction: "refund",
    amount: input.amount,
    method: "transfer_bank",
    status: "verified",
    paidAt: uow.now,
    reference: input.reference?.trim() || undefined,
    note: input.note?.trim() || undefined,
    submittedBy: userActor(userId),
    verifiedAt: uow.now,
    verifiedBy: userId,
    createdAt: uow.now,
    updatedAt: uow.now,
  })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "booking", id: booking.id },
    related: [{ type: "payment", id: paymentId }],
    action: "refund.recorded",
    message: `Refund ${formatIDR(input.amount)} untuk booking ${booking.code} telah ditransfer (simulasi)`,
  })
  return { paymentId, code }
}

export const paymentCommands = {
  verify: (userId: ID, paymentId: ID) => runCommand((uow) => verifyPayment(uow, userId, paymentId)),
  reject: (userId: ID, paymentId: ID, reason: string) => runCommand((uow) => rejectPayment(uow, userId, paymentId, reason)),
  record: (userId: ID, input: RecordPaymentInput) => runCommand((uow) => recordPayment(uow, userId, input)),
  refund: (userId: ID, input: { bookingId: ID; amount: number; reference?: string; note?: string }) =>
    runCommand((uow) => recordRefund(uow, userId, input)),
}
