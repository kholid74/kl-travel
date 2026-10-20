import type { DateOnly } from "@/lib/dates"
import type { Booking, Installment, Invoice, Payment } from "../entities"
import type { IDR } from "../types/common"
import { priceTotal } from "./pricing"

export type PaymentStatus =
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "refund_pending"
  | "refunded"
  | "closed"

export interface BookingFinancials {
  total: IDR
  invoiced: boolean
  paidIn: IDR
  refunded: IDR
  /** Verified money in minus verified refunds. */
  paidNet: IDR
  outstanding: IDR
  status: PaymentStatus
  /** Amount past due across installments (0 when nothing is late). */
  overdueAmount: IDR
  /** First installment that is not fully covered yet. */
  nextInstallment: { installment: Installment; remaining: IDR } | null
  /** Amount required to move awaiting_payment → confirmed. */
  firstInstallmentAmount: IDR
  hasPendingVerification: boolean
  pendingVerificationAmount: IDR
  refundDue: IDR
  refundRemaining: IDR
}

/** Always derived, never stored (ADR-0002). See docs/domain-model.md §6.5. */
export function bookingFinancials(input: {
  booking: Pick<Booking, "status" | "lines" | "discount" | "cancellation">
  invoice?: Pick<Invoice, "installments" | "voidedAt">
  payments: readonly Pick<Payment, "direction" | "amount" | "status">[]
  today: DateOnly
}): BookingFinancials {
  const { booking, invoice, payments, today } = input
  const total = priceTotal(booking)

  let paidIn = 0
  let refunded = 0
  let pendingVerificationAmount = 0
  for (const payment of payments) {
    if (payment.status === "verified") {
      if (payment.direction === "in") paidIn += payment.amount
      else refunded += payment.amount
    } else if (payment.status === "pending_verification" && payment.direction === "in") {
      pendingVerificationAmount += payment.amount
    }
  }
  const paidNet = paidIn - refunded
  const installments = [...(invoice?.installments ?? [])].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const firstInstallmentAmount = installments[0]?.amount ?? total

  let overdueAmount = 0
  let nextInstallment: BookingFinancials["nextInstallment"] = null
  let cumulative = 0
  for (const installment of installments) {
    cumulative += installment.amount
    const shortfall = cumulative - paidNet
    if (shortfall > 0) {
      if (!nextInstallment) nextInstallment = { installment, remaining: Math.min(shortfall, installment.amount) }
      if (installment.dueDate < today) overdueAmount = Math.max(overdueAmount, shortfall)
    }
  }

  const cancelled = booking.status === "cancelled"
  const refundDue = cancelled ? (booking.cancellation?.refundAmount ?? 0) : 0
  const refundRemaining = Math.max(0, refundDue - refunded)

  let status: PaymentStatus
  if (cancelled) {
    status = refundDue === 0 ? "closed" : refundRemaining > 0 ? "refund_pending" : "refunded"
  } else if (!invoice) {
    status = "unpaid"
  } else if (paidNet >= total) {
    status = "paid"
  } else if (overdueAmount > 0) {
    status = "overdue"
  } else if (paidNet > 0) {
    status = "partially_paid"
  } else {
    status = "unpaid"
  }

  return {
    total,
    invoiced: !!invoice && !invoice.voidedAt,
    paidIn,
    refunded,
    paidNet,
    outstanding: cancelled ? 0 : Math.max(0, total - paidNet),
    status,
    overdueAmount: cancelled ? 0 : overdueAmount,
    nextInstallment: cancelled ? null : nextInstallment,
    firstInstallmentAmount,
    hasPendingVerification: pendingVerificationAmount > 0,
    pendingVerificationAmount,
    refundDue,
    refundRemaining,
  }
}
