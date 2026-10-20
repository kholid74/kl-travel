import { describe, expect, it } from "vitest"
import { addDays, toDateOnlyWIB } from "@/lib/dates"
import { DomainError } from "@/lib/result"
import { getIndexes } from "@/domain/indexes"
import { priceTotal } from "@/domain/rules/pricing"
import { validateDatabase } from "@/domain/rules/validate-database"
import { LocalDatabase } from "@/repositories/mock/local-database"
import { createMemoryStorage } from "@/repositories/mock/storage"
import type { UnitOfWork } from "@/repositories"
import { approveBooking, cancelBooking, createManualBooking, extendHold } from "./booking-admin-service"
import { publishBlockers, savePackage, setPackageStatus, type PackageInput } from "./catalog-admin-service"
import { assignGuide, cancelDeparture, createDeparture, updateDeparture } from "./departure-service"
import { addFollowUp, convertInquiry, moveInquiryStage, respondQuotation, saveQuotation } from "./inquiry-admin-service"
import { placeWebsiteInquiry } from "./inquiry-service"
import { packageAvailability, selectPublicCatalog, upcomingDepartures } from "./queries/catalog"

const NOW = "2026-10-20T03:00:00.000Z"
const TODAY = "2026-10-20"
const OWNER = "usr_rania"
const SALES = "usr_dimas"
const OPS = "usr_bayu"
const CONTENT = "usr_nadia"

function setup() {
  const db = new LocalDatabase({ storage: createMemoryStorage(), clock: { now: () => new Date(NOW) } })
  db.load()
  return db
}

function expectError(fn: () => unknown, code: DomainError["code"]) {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError)
    expect((error as DomainError).code).toBe(code)
    return
  }
  throw new Error(`Expected DomainError ${code}`)
}

const valid = (db: LocalDatabase) => expect(validateDatabase(db.current().db, NOW)).toEqual([])
const run = <T,>(db: LocalDatabase, work: (uow: UnitOfWork) => T) => db.transaction(work)

describe("booking administration", () => {
  it("verifies a pending booking: invoice with installments summing to the total", () => {
    const db = setup()
    const pending = Object.values(db.current().db.bookings).find((b) => b.status === "pending")!
    expectError(() => run(db, (uow) => approveBooking(uow, CONTENT, pending.id)), "PERMISSION_DENIED")

    run(db, (uow) => approveBooking(uow, SALES, pending.id))
    const snapshot = db.current().db
    const booking = snapshot.bookings[pending.id]
    const invoice = getIndexes(snapshot).invoiceByBooking.get(booking.id)!
    expect(booking.status).toBe("awaiting_payment")
    expect(invoice.installments.reduce((sum, i) => sum + i.amount, 0)).toBe(priceTotal(booking))
    valid(db)
    expectError(() => run(db, (uow) => approveBooking(uow, SALES, pending.id)), "INVALID_TRANSITION")
  })

  it("extends a hold at most twice and moves the deposit due date with it", () => {
    const db = setup()
    const awaiting = Object.values(db.current().db.bookings).find((b) => b.status === "awaiting_payment" && !b.holdExtensions)!
    run(db, (uow) => extendHold(uow, SALES, awaiting.id))
    run(db, (uow) => extendHold(uow, SALES, awaiting.id))
    expectError(() => run(db, (uow) => extendHold(uow, SALES, awaiting.id)), "INVALID_TRANSITION")
    const snapshot = db.current().db
    const booking = snapshot.bookings[awaiting.id]
    expect(booking.holdExtensions).toBe(2)
    expect(getIndexes(snapshot).invoiceByBooking.get(booking.id)!.installments[0].dueDate).toBe(toDateOnlyWIB(booking.holdExpiresAt!))
    valid(db)
  })

  it("cancels a confirmed booking with the policy fee and releases its seats", () => {
    const db = setup()
    const snapshot = db.current().db
    const confirmed = Object.values(snapshot.bookings).find((b) => b.status === "confirmed" && snapshot.departures[b.departureId].kind === "scheduled")!
    const before = packageAvailability(snapshot, confirmed.packageId, NOW).options.find((o) => o.departure.id === confirmed.departureId)
    expectError(() => run(db, (uow) => cancelBooking(uow, SALES, confirmed.id, { reason: "customer_request" })), "PERMISSION_DENIED")

    const quote = run(db, (uow) => cancelBooking(uow, OWNER, confirmed.id, { reason: "customer_request", note: "Sakit" }))
    const after = db.current().db
    expect(after.bookings[confirmed.id].status).toBe("cancelled")
    expect(quote.waived).toBe(false)
    expect(after.bookings[confirmed.id].cancellation?.feeAmount).toBe(quote.fee)
    expect(getIndexes(after).invoiceByBooking.get(confirmed.id)?.voidedAt).toBeDefined()
    if (before) {
      const seats = packageAvailability(after, confirmed.packageId, NOW).options.find((o) => o.departure.id === confirmed.departureId)!.seats
      expect(seats.allocated).toBe(before.seats.allocated - getIndexes(after).paxOf(confirmed.id))
    }
    valid(db)
  })

  it("cancels the private departure together with its only booking", () => {
    const db = setup()
    const snapshot = db.current().db
    const booking = Object.values(snapshot.bookings).find(
      (b) => (b.status === "confirmed" || b.status === "awaiting_payment") && snapshot.departures[b.departureId].kind === "private",
    )!
    run(db, (uow) => cancelBooking(uow, OWNER, booking.id, { reason: "customer_request" }))
    expect(db.current().db.departures[booking.departureId].cancelledAt).toBeDefined()
    valid(db)
  })

  it("records a manual booking and can verify it in the same step", () => {
    const db = setup()
    const option = upcomingDepartures(db.current().db, NOW, 20).find((o) => o.seats.available >= 2)!
    const { bookingId } = run(db, (uow) =>
      createManualBooking(uow, SALES, {
        source: "whatsapp",
        approveNow: true,
        packageId: option.pkg.id,
        departureId: option.departure.id,
        contact: { fullName: "Tamu WhatsApp", phone: "0811-0000-9333" },
        contactTravels: true,
        travelers: [{ fullName: "Tamu WhatsApp" }, { fullName: "Teman Tamu" }],
      }),
    )
    const booking = db.current().db.bookings[bookingId]
    expect(booking.source).toBe("whatsapp")
    expect(booking.status).toBe("awaiting_payment")
    valid(db)
  })
})

describe("departure administration", () => {
  it("never lets capacity drop below taken and held seats", () => {
    const db = setup()
    const option = upcomingDepartures(db.current().db, NOW, 30).find((o) => o.seats.allocated + o.seats.held > 1)!
    const floor = option.seats.allocated + option.seats.held
    expectError(() => run(db, (uow) => updateDeparture(uow, OPS, option.departure.id, { capacity: floor - 1 })), "VALIDATION")
    run(db, (uow) => updateDeparture(uow, OPS, option.departure.id, { capacity: floor + 4 }))
    const after = packageAvailability(db.current().db, option.pkg.id, NOW).options.find((o) => o.departure.id === option.departure.id)!
    expect(after.seats.capacity).toBe(floor + 4)
    expect(after.seats.available).toBe(4)
    valid(db)
  })

  it("cancels a scheduled departure and every active booking on it without fees", () => {
    const db = setup()
    const option = upcomingDepartures(db.current().db, NOW, 30).find((o) => o.seats.allocated > 0)!
    const { cancelledBookings } = run(db, (uow) => cancelDeparture(uow, OPS, option.departure.id, "Cuaca buruk"))
    const after = db.current().db
    const bookings = getIndexes(after).bookingsByDeparture.get(option.departure.id)!
    expect(cancelledBookings).toBeGreaterThan(0)
    for (const b of bookings) {
      if (b.status === "cancelled" && b.cancellation?.reason === "departure_cancelled") expect(b.cancellation.feeAmount).toBe(0)
    }
    valid(db)
  })

  it("refuses to give a guide two overlapping trips", () => {
    const db = setup()
    const snapshot = db.current().db
    const assigned = Object.values(snapshot.departures).find(
      (d) =>
        d.guideId &&
        !d.cancelledAt &&
        d.startDate > TODAY &&
        Object.values(snapshot.departures).some((o) => o.id !== d.id && !o.guideId && !o.cancelledAt && o.startDate <= d.endDate && d.startDate <= o.endDate),
    )!
    const overlapping = Object.values(snapshot.departures).find(
      (o) => o.id !== assigned.id && !o.guideId && !o.cancelledAt && o.startDate <= assigned.endDate && assigned.startDate <= o.endDate,
    )!
    expectError(() => run(db, (uow) => assignGuide(uow, OPS, overlapping.id, assigned.guideId!)), "CONFLICT")
  })

  it("creates a departure with the package cost template and a checklist", () => {
    const db = setup()
    const pkg = Object.values(db.current().db.packages).find((p) => p.tripType === "open" && p.status === "published")!
    const departure = run(db, (uow) => createDeparture(uow, OPS, { packageId: pkg.id, startDate: addDays(TODAY, 120), capacity: 12, minParticipants: 4 }))
    const snapshot = db.current().db
    expect(getIndexes(snapshot).costItemsByDeparture.get(departure.id)?.length).toBe(getIndexes(snapshot).costItemsByPackage.get(pkg.id)?.length)
    expect(getIndexes(snapshot).checklistByDeparture.get(departure.id)).toBeDefined()
    expect(packageAvailability(snapshot, pkg.id, NOW).options.some((o) => o.departure.id === departure.id && o.bookable)).toBe(true)
    valid(db)
  })
})

describe("inquiry pipeline", () => {
  it("takes a private request from the website to a booking without duplicating the customer", () => {
    const db = setup()
    const pkg = Object.values(db.current().db.packages).find((p) => p.tripType === "private" && p.status === "published")!
    const contact = { fullName: "Laras Pramudita", phone: "0811-0000-9444" }
    const { inquiryId } = run(db, (uow) =>
      placeWebsiteInquiry(uow, { type: "private", contact, packageId: pkg.id, travelDates: { kind: "exact", startDate: addDays(TODAY, 40) }, groupSize: pkg.groupSize.min }),
    )
    run(db, (uow) => addFollowUp(uow, SALES, inquiryId, { channel: "whatsapp", body: "Konfirmasi tanggal", nextFollowUpDate: addDays(TODAY, 2) }))
    expect(db.current().db.inquiries[inquiryId].stage).toBe("contacted")
    expectError(() => run(db, (uow) => moveInquiryStage(uow, SALES, inquiryId, "quotation_sent")), "INVALID_TRANSITION")

    const quotation = run(db, (uow) =>
      saveQuotation(
        uow,
        SALES,
        inquiryId,
        {
          title: `${pkg.title} · ${pkg.groupSize.min} pax`,
          proposedStartDate: addDays(TODAY, 40),
          durationDays: pkg.durationDays,
          groupSize: pkg.groupSize.min,
          lines: [{ label: pkg.title, quantity: pkg.groupSize.min, unitPrice: 5_000_000 }],
          discount: 0,
          itinerarySummary: [],
          validDays: 7,
        },
        { send: true },
      ),
    )
    expect(db.current().db.inquiries[inquiryId].stage).toBe("quotation_sent")
    run(db, (uow) => respondQuotation(uow, SALES, quotation.id, "accepted"))
    expect(db.current().db.inquiries[inquiryId].stage).toBe("won")

    const customersBefore = Object.keys(db.current().db.customers).length
    const { bookingId } = run(db, (uow) => convertInquiry(uow, SALES, inquiryId))
    const after = db.current().db
    const booking = after.bookings[bookingId]
    expect(Object.keys(after.customers).length).toBe(customersBefore)
    expect(booking.customerId).toBe(after.inquiries[inquiryId].customerId)
    expect(after.inquiries[inquiryId].convertedBookingId).toBe(bookingId)
    expect(after.departures[booking.departureId].kind).toBe("private")
    expect(after.departures[booking.departureId].capacity).toBe(pkg.groupSize.min)
    expect(booking.status).toBe("awaiting_payment")
    expect(priceTotal(booking)).toBe(pkg.groupSize.min * 5_000_000)
    valid(db)
    expectError(() => run(db, (uow) => convertInquiry(uow, SALES, inquiryId)), "INVALID_TRANSITION")
  })

  it("turns an accepted custom quotation into an unlisted package", () => {
    const db = setup()
    const { inquiryId } = run(db, (uow) =>
      placeWebsiteInquiry(uow, {
        type: "custom",
        contact: { fullName: "Bima Aryasatya", phone: "0811-0000-9555" },
        destinationIds: ["dst_lombok"],
        travelDates: { kind: "flexible", month: "2027-01" },
        durationDays: 3,
        groupSize: 5,
      }),
    )
    const quotation = run(db, (uow) =>
      saveQuotation(
        uow,
        SALES,
        inquiryId,
        {
          title: "Custom Lombok Keluarga",
          proposedStartDate: addDays(TODAY, 60),
          durationDays: 3,
          groupSize: 5,
          lines: [{ label: "Custom Lombok 3H2M per orang", quantity: 5, unitPrice: 3_200_000 }],
          discount: 500_000,
          itinerarySummary: ["Tiba & Senggigi", "Gili Nanggu", "Pulang"],
          validDays: 7,
        },
        { send: true },
      ),
    )
    run(db, (uow) => respondQuotation(uow, SALES, quotation.id, "accepted"))
    const { bookingId } = run(db, (uow) => convertInquiry(uow, SALES, inquiryId))
    const after = db.current().db
    const pkg = after.packages[after.bookings[bookingId].packageId]
    expect(pkg.tripType).toBe("custom")
    expect(pkg.visibility).toBe("unlisted")
    expect(pkg.itinerary).toHaveLength(3)
    expect(selectPublicCatalog(after).packages.some((p) => p.id === pkg.id)).toBe(false)
    valid(db)
  })

  it("requires a lost reason", () => {
    const db = setup()
    const inquiry = Object.values(db.current().db.inquiries).find((i) => i.stage === "contacted")!
    expectError(() => run(db, (uow) => moveInquiryStage(uow, SALES, inquiry.id, "lost")), "INVALID_TRANSITION")
    run(db, (uow) => moveInquiryStage(uow, SALES, inquiry.id, "lost", "harga"))
    expect(db.current().db.inquiries[inquiry.id].lostReason).toBe("harga")
  })
})

describe("package publishing", () => {
  it("publishes a valid package to the public catalog and blocks incomplete ones", () => {
    const db = setup()
    const base = Object.values(db.current().db.packages).find((p) => p.tripType === "open" && p.status === "published")!
    const { id: _id, code: _code, status: _status, publishedAt: _published, visibility: _visibility, sourceQuotationId: _source, createdAt: _c, updatedAt: _u, ...rest } = base
    const input: PackageInput = { ...rest, title: "Paket Baru Uji", slug: "", itinerary: [] }
    expectError(() => run(db, (uow) => savePackage(uow, SALES, input)), "PERMISSION_DENIED")

    const draft = run(db, (uow) => savePackage(uow, OPS, input))
    expect(draft.status).toBe("draft")
    expect(draft.slug).toBe("paket-baru-uji")
    expect(publishBlockers(draft, db.current().db.destinations[draft.destinationId])).toContain("Tambahkan minimal satu hari itinerary.")
    expectError(() => run(db, (uow) => setPackageStatus(uow, CONTENT, draft.id, "published")), "VALIDATION")

    run(db, (uow) => savePackage(uow, OPS, { ...input, slug: draft.slug, itinerary: base.itinerary }, draft.id))
    expectError(() => run(db, (uow) => setPackageStatus(uow, OPS, draft.id, "published")), "PERMISSION_DENIED")
    run(db, (uow) => setPackageStatus(uow, CONTENT, draft.id, "published"))
    expect(selectPublicCatalog(db.current().db).packages.some((p) => p.id === draft.id)).toBe(true)
    valid(db)
  })
})
