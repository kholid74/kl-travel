import { describe, expect, it } from "vitest"
import { DomainError } from "@/lib/result"
import { getIndexes } from "@/domain/indexes"
import { bookingFinancials } from "@/domain/rules/payment-status"
import { validateDatabase } from "@/domain/rules/validate-database"
import { LocalDatabase } from "@/repositories/mock/local-database"
import { createMemoryStorage } from "@/repositories/mock/storage"
import { placeWebsiteBooking, recordPaymentConfirmation, type WebsiteBookingInput } from "./booking-service"
import { placeWebsiteInquiry } from "./inquiry-service"
import { packageAvailability, selectPublicCatalog, upcomingDepartures } from "./queries/catalog"

const NOW = "2026-10-20T03:00:00.000Z"

function setup() {
  const db = new LocalDatabase({ storage: createMemoryStorage(), clock: { now: () => new Date(NOW) } })
  db.load()
  return db
}

const contact = { fullName: "Nadia Putri", phone: "0811-0000-9001", email: "nadia.putri@example.com" }

function bookingInput(db: LocalDatabase, pax: number, overrides: Partial<WebsiteBookingInput> = {}): WebsiteBookingInput {
  const option = upcomingDepartures(db.current().db, NOW, 50).find((o) => o.seats.available >= pax)!
  return {
    packageId: option.pkg.id,
    departureId: option.departure.id,
    contact,
    contactTravels: true,
    travelers: Array.from({ length: pax }, (_, i) => ({ fullName: i === 0 ? contact.fullName : `Peserta ${i + 1}` })),
    ...overrides,
  }
}

function expectDomainError(fn: () => unknown, code: DomainError["code"]) {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError)
    expect((error as DomainError).code).toBe(code)
    return
  }
  throw new Error(`Expected DomainError ${code}`)
}

describe("public catalog read model", () => {
  it("lists only published catalog packages and bookable departures", () => {
    const snapshot = setup().current().db
    const { packages } = selectPublicCatalog(snapshot)
    expect(packages.length).toBe(16) // 18 fixtures minus one draft and one archived
    expect(packages.every((p) => p.status === "published" && p.visibility === "catalog")).toBe(true)
    const upcoming = upcomingDepartures(snapshot, NOW, 6)
    expect(upcoming).toHaveLength(6)
    expect(upcoming.every((o) => o.bookable && o.seats.available > 0)).toBe(true)
    expect(upcoming.map((o) => o.departure.startDate)).toEqual([...upcoming.map((o) => o.departure.startDate)].sort())
  })
})

describe("website booking", () => {
  it("creates a pending booking with a seat hold and keeps the data consistent", () => {
    const db = setup()
    const input = bookingInput(db, 2)
    const before = packageAvailability(db.current().db, input.packageId, NOW).options.find((o) => o.departure.id === input.departureId)!

    const { bookingId, code } = db.transaction((uow) => placeWebsiteBooking(uow, input))
    const snapshot = db.current().db
    const booking = snapshot.bookings[bookingId]

    expect(code).toMatch(/^NV-2610-\d{4}$/)
    expect(booking.status).toBe("pending")
    expect(booking.holdExpiresAt).toBe("2026-10-21T03:00:00.000Z")
    expect(booking.lines[0].quantity).toBe(2)
    expect(getIndexes(snapshot).paxOf(bookingId)).toBe(2)
    const after = packageAvailability(snapshot, input.packageId, NOW).options.find((o) => o.departure.id === input.departureId)!
    expect(after.seats.held).toBe(before.seats.held + 2)
    expect(after.seats.available).toBe(before.seats.available - 2)
    expect(validateDatabase(snapshot, NOW)).toEqual([])
    expect(Object.values(snapshot.activity).some((e) => e.action === "booking.created" && e.subject.id === bookingId)).toBe(true)
  })

  it("rejects more travelers than the remaining seats", () => {
    const db = setup()
    const input = bookingInput(db, 1)
    const available = packageAvailability(db.current().db, input.packageId, NOW).options.find((o) => o.departure.id === input.departureId)!
      .seats.available
    const tooMany = { ...input, travelers: Array.from({ length: available + 1 }, () => ({ fullName: "Peserta" })) }
    expectDomainError(() => db.transaction((uow) => placeWebsiteBooking(uow, tooMany)), available + 1 > 10 ? "VALIDATION" : "SEATS_UNAVAILABLE")
  })

  it("reuses the customer with the same phone number", () => {
    const db = setup()
    const existing = Object.values(db.current().db.customers)[0]
    const input = bookingInput(db, 1, { contact: { fullName: "Nama Lain", phone: existing.phone } })
    const { bookingId } = db.transaction((uow) => placeWebsiteBooking(uow, input))
    const snapshot = db.current().db
    expect(snapshot.bookings[bookingId].customerId).toBe(existing.id)
    expect(snapshot.customers[existing.id].fullName).toBe(existing.fullName)
    expect(snapshot.customers[existing.id].notes.at(-1)?.body).toContain("Nama Lain")
  })

  it("rejects invalid phone numbers", () => {
    const db = setup()
    expectDomainError(() => db.transaction((uow) => placeWebsiteBooking(uow, bookingInput(db, 1, { contact: { fullName: "A", phone: "12345" } }))), "VALIDATION")
  })
})

describe("payment confirmation", () => {
  it("records a payment awaiting verification, capped at the unconfirmed balance", () => {
    const db = setup()
    const snapshot = db.current().db
    const idx = getIndexes(snapshot)
    const booking = Object.values(snapshot.bookings).find(
      (b) => b.status === "awaiting_payment" && !(idx.paymentsByBooking.get(b.id) ?? []).some((p) => p.status === "pending_verification"),
    )!
    const fin = bookingFinancials({ booking, invoice: idx.invoiceByBooking.get(booking.id), payments: idx.paymentsByBooking.get(booking.id) ?? [], today: "2026-10-20" })

    expectDomainError(
      () => db.transaction((uow) => recordPaymentConfirmation(uow, { bookingId: booking.id, amount: fin.outstanding + 1000, method: "transfer_bank", senderName: "Uji" })),
      "VALIDATION",
    )
    const { paymentId } = db.transaction((uow) =>
      recordPaymentConfirmation(uow, { bookingId: booking.id, amount: fin.firstInstallmentAmount, method: "transfer_bank", senderName: "Uji" }),
    )
    const after = db.current().db
    expect(after.payments[paymentId].status).toBe("pending_verification")
    expect(after.bookings[booking.id].status).toBe("awaiting_payment")
    expect(validateDatabase(after, NOW)).toEqual([])
  })

  it("is refused for bookings that have not been invoiced", () => {
    const db = setup()
    const pending = Object.values(db.current().db.bookings).find((b) => b.status === "pending")!
    expectDomainError(
      () => db.transaction((uow) => recordPaymentConfirmation(uow, { bookingId: pending.id, amount: 100_000, method: "qris", senderName: "" })),
      "INVALID_TRANSITION",
    )
  })
})

describe("website inquiries", () => {
  it("creates private, custom, and general inquiries in the Baru stage", () => {
    const db = setup()
    const snapshot = db.current().db
    const privatePkg = Object.values(snapshot.packages).find((p) => p.tripType === "private" && p.status === "published")!

    const priv = db.transaction((uow) =>
      placeWebsiteInquiry(uow, {
        type: "private",
        contact,
        packageId: privatePkg.id,
        travelDates: { kind: "exact", startDate: "2026-12-10" },
        groupSize: privatePkg.groupSize.min,
      }),
    )
    const custom = db.transaction((uow) =>
      placeWebsiteInquiry(uow, {
        type: "custom",
        contact,
        destinationIds: ["dst_bali", "dst_lombok"],
        travelDates: { kind: "flexible", month: "2027-02" },
        durationDays: 6,
        groupSize: 4,
        budgetPerPax: "5_10jt",
        interests: ["snorkeling", "kuliner"],
      }),
    )
    const after = db.current().db
    expect(after.inquiries[priv.inquiryId].stage).toBe("new")
    expect(after.inquiries[priv.inquiryId].destinationIds).toEqual([privatePkg.destinationId])
    expect(after.inquiries[custom.inquiryId].customerId).toBe(after.inquiries[priv.inquiryId].customerId)
    expect(validateDatabase(after, NOW)).toEqual([])

    expectDomainError(
      () => db.transaction((uow) => placeWebsiteInquiry(uow, { type: "general", contact, travelDates: { kind: "flexible" }, groupSize: 1 })),
      "VALIDATION",
    )
    expectDomainError(
      () =>
        db.transaction((uow) =>
          placeWebsiteInquiry(uow, {
            type: "private",
            contact,
            packageId: privatePkg.id,
            travelDates: { kind: "flexible" },
            groupSize: privatePkg.groupSize.max + 1,
          }),
        ),
      "VALIDATION",
    )
  })
})
