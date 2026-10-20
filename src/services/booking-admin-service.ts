import { addHours, toDateOnlyWIB, type DateOnly } from "@/lib/dates"
import { formatDateTime } from "@/lib/format"
import { normalizePhone } from "@/lib/phone"
import { DomainError } from "@/lib/result"
import type { CancellationReason, Traveler } from "@/domain/entities"
import { approveGuard, cancelGuard, completeGuard, extendHoldGuard, holdExpired, HOLD_EXTENSION_HOURS } from "@/domain/rules/booking-lifecycle"
import type { CancellationQuote } from "@/domain/rules/cancellation"
import type { ID, Source } from "@/domain/types/common"
import type { UnitOfWork } from "@/repositories"
import { logActivity } from "./activity-log"
import { requirePermission, userActor } from "./authz"
import { applyCancellation, financialsOf, issueInvoice } from "./booking-effects"
import { placeOpenTripBooking, type WebsiteBookingInput } from "./booking-service"
import { seatsOf } from "./departure-service"
import { runCommand } from "./runtime"

/** Pending → awaiting payment: the team confirms availability and the invoice is issued (§5.1). */
export function approveBooking(uow: UnitOfWork, userId: ID, bookingId: ID) {
  requirePermission(uow, userId, "bookings.manage")
  const booking = uow.bookings.require(bookingId)
  const guard = approveGuard(booking)
  if (guard) throw new DomainError("INVALID_TRANSITION", guard)
  if (holdExpired(booking, uow.now)) throw new DomainError("INVALID_TRANSITION", "Batas waktu verifikasi sudah lewat; kursi sudah dilepas.")

  const holdExpiresAt = addHours(uow.now, uow.settings.get().booking.depositHoldHours)
  const updated = uow.bookings.update(booking.id, { status: "awaiting_payment", holdExpiresAt, updatedAt: uow.now })
  const invoice = issueInvoice(uow, updated)
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "booking", id: booking.id },
    related: [{ type: "invoice", id: invoice.id }],
    action: "booking.approved",
    message: `Booking ${booking.code} diverifikasi, invoice ${invoice.number} diterbitkan`,
  })
  return { invoiceId: invoice.id, number: invoice.number }
}

/**
 * Adds 24 hours to a hold, at most twice (§5.1). An expired hold no longer counts, so
 * renewing it must fit within the seats that are free right now.
 */
export function extendHold(uow: UnitOfWork, userId: ID, bookingId: ID) {
  requirePermission(uow, userId, "bookings.manage")
  const booking = uow.bookings.require(bookingId)
  const guard = extendHoldGuard(booking)
  if (guard) throw new DomainError("INVALID_TRANSITION", guard)

  if (holdExpired(booking, uow.now)) {
    const departure = uow.departures.require(booking.departureId)
    const seats = seatsOf(uow, departure.id)
    const pax = uow.bookingTravelers.find((bt) => bt.bookingId === booking.id).length
    if (seats.allocated + seats.held + pax > departure.capacity) {
      throw new DomainError("SEATS_UNAVAILABLE", "Kursi yang dilepas sudah terisi booking lain.")
    }
  }
  const base = booking.holdExpiresAt && booking.holdExpiresAt > uow.now ? booking.holdExpiresAt : uow.now
  const holdExpiresAt = addHours(base, HOLD_EXTENSION_HOURS)
  uow.bookings.update(booking.id, { holdExpiresAt, holdExtensions: (booking.holdExtensions ?? 0) + 1, updatedAt: uow.now })

  // The deposit is due when the hold ends, so the first installment follows it.
  const invoice = uow.invoices.find((i) => i.bookingId === booking.id && !i.voidedAt)[0]
  if (invoice && invoice.installments.length) {
    const [first, ...rest] = invoice.installments
    uow.invoices.update(invoice.id, { installments: [{ ...first, dueDate: toDateOnlyWIB(holdExpiresAt) }, ...rest], updatedAt: uow.now })
  }
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "booking", id: booking.id },
    action: "booking.hold_extended",
    message: `Batas waktu booking ${booking.code} diperpanjang hingga ${formatDateTime(holdExpiresAt)}`,
  })
  return { holdExpiresAt }
}

export function cancelBooking(uow: UnitOfWork, userId: ID, bookingId: ID, input: { reason: CancellationReason; note?: string }): CancellationQuote {
  requirePermission(uow, userId, "bookings.cancel")
  const booking = uow.bookings.require(bookingId)
  const guard = cancelGuard(booking)
  if (guard) throw new DomainError("INVALID_TRANSITION", guard)
  if (input.reason === "hold_expired" || input.reason === "departure_cancelled") {
    throw new DomainError("VALIDATION", "Alasan ini dicatat otomatis oleh sistem.", "reason")
  }
  return applyCancellation(uow, booking.id, { reason: input.reason, actor: userActor(userId), note: input.note })
}

export function completeBooking(uow: UnitOfWork, userId: ID, bookingId: ID) {
  requirePermission(uow, userId, "bookings.manage")
  const booking = uow.bookings.require(bookingId)
  const departure = uow.departures.require(booking.departureId)
  const checklist = uow.checklists.find((c) => c.departureId === departure.id)[0]
  const guard = completeGuard({
    booking,
    departure,
    financials: financialsOf(uow, booking),
    checklistComplete: !!checklist && checklist.items.every((item) => item.done),
    today: toDateOnlyWIB(uow.now),
  })
  if (guard) throw new DomainError("INVALID_TRANSITION", guard)
  uow.bookings.update(booking.id, { status: "completed", completedAt: uow.now, updatedAt: uow.now })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "booking", id: booking.id },
    action: "booking.completed",
    message: `Booking ${booking.code} ditandai Selesai`,
  })
}

export interface TravelerUpdate {
  travelerId: ID
  fullName: string
  gender: "L" | "P" | ""
  dateOfBirth: DateOnly | ""
  phone: string
  emergencyName: string
  emergencyPhone: string
  dietaryNotes: string
}

/** Completes traveler data for the manifest. Empty fields stay empty (counted as incomplete). */
export function updateTravelers(uow: UnitOfWork, userId: ID, bookingId: ID, updates: TravelerUpdate[]) {
  requirePermission(uow, userId, "bookings.manage")
  const booking = uow.bookings.require(bookingId)
  if (booking.status === "cancelled") throw new DomainError("INVALID_TRANSITION", "Booking sudah dibatalkan.")
  const onBooking = new Set(uow.bookingTravelers.find((bt) => bt.bookingId === booking.id).map((bt) => bt.travelerId))
  const today = toDateOnlyWIB(uow.now)

  for (const update of updates) {
    if (!onBooking.has(update.travelerId)) throw new DomainError("NOT_FOUND", "Peserta tidak ada di booking ini.")
    if (update.dateOfBirth && update.dateOfBirth >= today) throw new DomainError("VALIDATION", "Tanggal lahir harus sebelum hari ini.", "dateOfBirth")
    const phone = update.phone.trim() ? normalizePhone(update.phone) : null
    if (update.phone.trim() && !phone) throw new DomainError("VALIDATION", `Nomor telepon ${update.fullName || "peserta"} tidak valid.`, "phone")
    const emergencyPhone = update.emergencyPhone.trim() ? normalizePhone(update.emergencyPhone) : null
    if (update.emergencyPhone.trim() && !emergencyPhone) throw new DomainError("VALIDATION", "Nomor kontak darurat tidak valid.", "emergencyPhone")

    const patch: Partial<Traveler> = {
      fullName: update.fullName.trim() || undefined,
      gender: update.gender || undefined,
      dateOfBirth: update.dateOfBirth || undefined,
      phone: phone ?? undefined,
      emergencyContact: update.emergencyName.trim() && emergencyPhone ? { name: update.emergencyName.trim(), phone: emergencyPhone } : undefined,
      dietaryNotes: update.dietaryNotes.trim() || undefined,
      updatedAt: uow.now,
    }
    uow.travelers.update(update.travelerId, patch)
  }
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "booking", id: booking.id },
    action: "booking.travelers_updated",
    message: `Data peserta booking ${booking.code} diperbarui`,
  })
}

export interface ManualBookingInput extends WebsiteBookingInput {
  source: Exclude<Source, "website">
  /** Verify immediately and issue the invoice in the same step. */
  approveNow: boolean
}

/** Booking taken over WhatsApp, Instagram, or at the office. Same seat rules as the website. */
export function createManualBooking(uow: UnitOfWork, userId: ID, input: ManualBookingInput) {
  requirePermission(uow, userId, "bookings.manage")
  const result = placeOpenTripBooking(uow, input, { source: input.source, userId })
  if (input.approveNow) approveBooking(uow, userId, result.bookingId)
  return result
}

export const bookingCommands = {
  approve: (userId: ID, bookingId: ID) => runCommand((uow) => approveBooking(uow, userId, bookingId)),
  extendHold: (userId: ID, bookingId: ID) => runCommand((uow) => extendHold(uow, userId, bookingId)),
  cancel: (userId: ID, bookingId: ID, input: { reason: CancellationReason; note?: string }) =>
    runCommand((uow) => cancelBooking(uow, userId, bookingId, input)),
  complete: (userId: ID, bookingId: ID) => runCommand((uow) => completeBooking(uow, userId, bookingId)),
  updateTravelers: (userId: ID, bookingId: ID, updates: TravelerUpdate[]) => runCommand((uow) => updateTravelers(uow, userId, bookingId, updates)),
  createManual: (userId: ID, input: ManualBookingInput) => runCommand((uow) => createManualBooking(uow, userId, input)),
}
