import type { BookingStatus } from "@/domain/entities"
import type { PaymentStatus } from "@/domain/rules/payment-status"
import type { Tone } from "@/components/shared/status-badge"

export const BOOKING_STATUS_TONE: Record<BookingStatus, Tone> = {
  pending: "info",
  awaiting_payment: "warning",
  confirmed: "success",
  completed: "neutral",
  cancelled: "danger",
}

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, Tone> = {
  unpaid: "neutral",
  partially_paid: "warning",
  paid: "success",
  overdue: "danger",
  refund_pending: "warning",
  refunded: "neutral",
  closed: "neutral",
}
