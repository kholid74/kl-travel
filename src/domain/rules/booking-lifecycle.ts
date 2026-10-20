import type { DateOnly, Timestamp } from "@/lib/dates"
import type { Booking, BookingStatus, Departure } from "../entities"
import type { BookingFinancials } from "./payment-status"

export const MAX_HOLD_EXTENSIONS = 2
export const HOLD_EXTENSION_HOURS = 24

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["awaiting_payment", "cancelled"],
  awaiting_payment: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
}

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

export function isActiveBooking(status: BookingStatus): boolean {
  return status !== "cancelled"
}

/** Each check returns null when allowed, or a reason that can be shown to the user. */
export type Guard = string | null

export function approveGuard(booking: Pick<Booking, "status">): Guard {
  return booking.status === "pending" ? null : "Hanya booking yang menunggu verifikasi yang bisa diverifikasi."
}

export function extendHoldGuard(booking: Pick<Booking, "status" | "holdExtensions">): Guard {
  if (booking.status !== "pending" && booking.status !== "awaiting_payment") {
    return "Hold hanya berlaku untuk booking yang belum terkonfirmasi."
  }
  if ((booking.holdExtensions ?? 0) >= MAX_HOLD_EXTENSIONS) {
    return `Hold sudah diperpanjang ${MAX_HOLD_EXTENSIONS} kali.`
  }
  return null
}

export function cancelGuard(booking: Pick<Booking, "status">): Guard {
  if (booking.status === "cancelled") return "Booking sudah dibatalkan."
  if (booking.status === "completed") return "Booking yang sudah selesai tidak dapat dibatalkan."
  return null
}

export function completeGuard(input: {
  booking: Pick<Booking, "status">
  departure: Pick<Departure, "endDate">
  financials: Pick<BookingFinancials, "status">
  /** Invariant 13: a finished trip is closed only after its operations checklist is complete. */
  checklistComplete: boolean
  today: DateOnly
}): Guard {
  if (input.booking.status !== "confirmed") return "Hanya booking terkonfirmasi yang bisa diselesaikan."
  if (input.today <= input.departure.endDate) return "Trip belum berakhir."
  if (input.financials.status !== "paid") return "Booking belum lunas."
  if (!input.checklistComplete) return "Checklist operasional trip belum lengkap."
  return null
}

export function paymentGuard(booking: Pick<Booking, "status">): Guard {
  return booking.status === "awaiting_payment" || booking.status === "confirmed"
    ? null
    : "Pembayaran hanya bisa dicatat untuk booking yang sudah ditagih dan belum dibatalkan."
}

export function holdExpired(booking: Pick<Booking, "status" | "holdExpiresAt">, now: Timestamp): boolean {
  return (
    (booking.status === "pending" || booking.status === "awaiting_payment") &&
    !!booking.holdExpiresAt &&
    Date.parse(booking.holdExpiresAt) <= Date.parse(now)
  )
}
