import { addHours, toDateOnlyWIB, type DateOnly } from "@/lib/dates"
import { formatDate, formatIDR } from "@/lib/format"
import { createId } from "@/lib/ids"
import { normalizePhone } from "@/lib/phone"
import { DomainError } from "@/lib/result"
import type { Booking, PaymentMethod, Traveler } from "@/domain/entities"
import { getIndexes } from "@/domain/indexes"
import { departureDisplayStatus, isBookable, seatSummary } from "@/domain/rules/availability"
import { paymentGuard } from "@/domain/rules/booking-lifecycle"
import { bookingFinancials } from "@/domain/rules/payment-status"
import { pricePerPax } from "@/domain/rules/pricing"
import type { ID } from "@/domain/types/common"
import { PROOF_ILLUSTRATION_ID } from "@/data/seed/build-seed"
import type { UnitOfWork } from "@/repositories"
import { logActivity } from "./activity-log"
import { nextCode } from "./codes"
import { resolveCustomer, type ContactInput } from "./customer-service"
import { runCommand } from "./runtime"

export interface TravelerInput {
  fullName: string
  gender?: "L" | "P"
  dateOfBirth?: DateOnly
}

export interface WebsiteBookingInput {
  packageId: ID
  departureId: ID
  contact: ContactInput
  /** The contact person travels and is the first entry of `travelers`. */
  contactTravels: boolean
  /** One entry per seat. */
  travelers: TravelerInput[]
  emergencyContact?: { name: string; phone: string }
  specialRequests?: string
}

/**
 * Open Trip booking from the website (docs/domain-model.md §6.3). Seats are checked
 * against the latest stored data inside the transaction, so two tabs cannot overbook.
 */
export function placeWebsiteBooking(uow: UnitOfWork, input: WebsiteBookingInput): { bookingId: ID; code: string } {
  const pax = input.travelers.length
  const settings = uow.settings.get().booking
  if (pax < 1) throw new DomainError("VALIDATION", "Tambahkan minimal satu peserta.", "travelers")

  const pkg = uow.packages.get(input.packageId)
  if (!pkg || pkg.status !== "published" || pkg.visibility !== "catalog" || pkg.tripType !== "open") {
    throw new DomainError("NOT_FOUND", "Paket ini tidak lagi tersedia untuk dipesan.")
  }
  const departure = uow.departures.get(input.departureId)
  if (!departure || departure.packageId !== pkg.id || departure.kind !== "scheduled") {
    throw new DomainError("NOT_FOUND", "Keberangkatan tidak ditemukan.", "departureId")
  }

  const idx = getIndexes(uow.snapshot())
  const today = toDateOnlyWIB(uow.now)
  const seats = seatSummary(departure, idx.bookingsByDeparture.get(departure.id) ?? [], idx.paxOf, uow.now)
  const status = departureDisplayStatus({ departure, seats, today, settings, packageArchived: false })
  if (!isBookable(status)) {
    throw new DomainError(
      "SEATS_UNAVAILABLE",
      status === "full" ? "Keberangkatan ini baru saja penuh. Silakan pilih jadwal lain." : "Penjualan untuk keberangkatan ini sudah ditutup.",
      "departureId",
    )
  }
  if (pax > settings.maxPaxPerBooking) {
    throw new DomainError("VALIDATION", `Maksimal ${settings.maxPaxPerBooking} peserta per booking.`, "travelers")
  }
  if (pax > seats.available) {
    throw new DomainError("SEATS_UNAVAILABLE", `Sisa kursi untuk keberangkatan ini tinggal ${seats.available}.`, "travelers")
  }

  const { customer } = resolveCustomer(uow, input.contact, "website")
  const emergencyPhone = input.emergencyContact?.phone ? normalizePhone(input.emergencyContact.phone) : null
  const emergencyContact =
    input.emergencyContact?.name.trim() && emergencyPhone ? { name: input.emergencyContact.name.trim(), phone: emergencyPhone } : undefined

  const bookingId = createId("bk")
  const code = nextCode(uow, "booking")
  // One traveler record per seat, as in the seed; details left empty count as incomplete.
  const travelerIds = input.travelers.map((entry, index) => {
    const self = input.contactTravels && index === 0
    const traveler: Traveler = {
      id: createId("trv"),
      customerId: customer.id,
      isCustomerSelf: self,
      fullName: entry.fullName.trim() || undefined,
      gender: entry.gender,
      dateOfBirth: entry.dateOfBirth,
      phone: self ? customer.phone : undefined,
      emergencyContact,
      createdAt: uow.now,
      updatedAt: uow.now,
    }
    return uow.travelers.insert(traveler).id
  })

  const unitPrice = pricePerPax(pkg, pax, departure) ?? 0
  const booking: Booking = {
    id: bookingId,
    code,
    customerId: customer.id,
    packageId: pkg.id,
    departureId: departure.id,
    tripType: pkg.tripType,
    source: "website",
    status: "pending",
    lines: [{ id: createId("pl"), label: `${pkg.title} · ${formatDate(departure.startDate)}`, quantity: pax, unitPrice }],
    discount: 0,
    holdExpiresAt: addHours(uow.now, settings.pendingHoldHours),
    specialRequests: input.specialRequests?.trim() || undefined,
    createdAt: uow.now,
    updatedAt: uow.now,
  }
  uow.bookings.insert(booking)
  travelerIds.forEach((travelerId, index) => {
    uow.bookingTravelers.insert({ id: createId("bt"), bookingId, travelerId, isLead: index === 0 })
  })

  logActivity(uow, {
    actor: { kind: "customer", customerId: customer.id },
    subject: { type: "booking", id: bookingId },
    related: [
      { type: "departure", id: departure.id },
      { type: "customer", id: customer.id },
    ],
    action: "booking.created",
    message: `Booking ${code} masuk dari website untuk ${pkg.title} (${pax} pax)`,
  })
  return { bookingId, code }
}

export const submitWebsiteBooking = (input: WebsiteBookingInput) => runCommand((uow) => placeWebsiteBooking(uow, input))

export interface PaymentConfirmationInput {
  bookingId: ID
  amount: number
  method: PaymentMethod
  senderName: string
}

/**
 * "Saya sudah transfer" from the public confirmation page. Creates a payment waiting for
 * finance verification; nothing is charged and no file is uploaded (docs/domain-model.md §5.4).
 */
export function recordPaymentConfirmation(uow: UnitOfWork, input: PaymentConfirmationInput): { paymentId: ID; code: string } {
  const booking = uow.bookings.require(input.bookingId)
  const guard = paymentGuard(booking)
  if (guard) throw new DomainError("INVALID_TRANSITION", guard)

  const idx = getIndexes(uow.snapshot())
  const invoice = idx.invoiceByBooking.get(booking.id)
  const fin = bookingFinancials({
    booking,
    invoice,
    payments: idx.paymentsByBooking.get(booking.id) ?? [],
    today: toDateOnlyWIB(uow.now),
  })
  const payable = fin.outstanding - fin.pendingVerificationAmount
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new DomainError("VALIDATION", "Masukkan nominal pembayaran.", "amount")
  if (payable <= 0) throw new DomainError("CONFLICT", "Seluruh tagihan sudah dibayar atau sedang diverifikasi.")
  if (input.amount > payable) {
    throw new DomainError("VALIDATION", `Nominal melebihi sisa tagihan yang belum dikonfirmasi (${formatIDR(payable)}).`, "amount")
  }

  const paymentId = createId("pay")
  const code = nextCode(uow, "payment")
  uow.payments.insert({
    id: paymentId,
    code,
    bookingId: booking.id,
    invoiceId: invoice?.id,
    direction: "in",
    amount: input.amount,
    method: input.method,
    status: "pending_verification",
    paidAt: uow.now,
    reference: input.senderName.trim() ? `a.n. ${input.senderName.trim()}` : undefined,
    proofMediaId: PROOF_ILLUSTRATION_ID,
    submittedBy: { kind: "customer", customerId: booking.customerId },
    createdAt: uow.now,
    updatedAt: uow.now,
  })
  logActivity(uow, {
    actor: { kind: "customer", customerId: booking.customerId },
    subject: { type: "booking", id: booking.id },
    related: [{ type: "payment", id: paymentId }],
    action: "payment.submitted",
    message: `Pelanggan mengirim konfirmasi pembayaran ${formatIDR(input.amount)} untuk booking ${booking.code}`,
  })
  return { paymentId, code }
}

export const submitPaymentConfirmation = (input: PaymentConfirmationInput) =>
  runCommand((uow) => recordPaymentConfirmation(uow, input))
