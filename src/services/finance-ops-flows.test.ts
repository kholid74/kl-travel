import { describe, expect, it } from "vitest"
import { toDateOnlyWIB } from "@/lib/dates"
import { DomainError } from "@/lib/result"
import { getIndexes } from "@/domain/indexes"
import { departureEstimate, departureRealized } from "@/domain/rules/metrics"
import { bookingFinancials } from "@/domain/rules/payment-status"
import {
  bookingTrendReport,
  leadConversion,
  outstandingAging,
  profitabilityReport,
  reportRange,
} from "@/domain/rules/reports"
import { validateDatabase } from "@/domain/rules/validate-database"
import { LocalDatabase } from "@/repositories/mock/local-database"
import { createMemoryStorage } from "@/repositories/mock/storage"
import type { UnitOfWork } from "@/repositories"
import { cancelBooking, completeBooking } from "./booking-admin-service"
import { recordActualCosts, saveCostItems } from "./costing-service"
import { assignGuide } from "./departure-service"
import { assignVendor, setChecklistItem, setVendorAssignmentStatus } from "./operations-service"
import { recordPayment, recordRefund, rejectPayment, verifyPayment } from "./payment-service"

const NOW = "2026-10-20T03:00:00.000Z"
const TODAY = "2026-10-20"
const OWNER = "usr_rania"
const SALES = "usr_dimas"
const OPS = "usr_bayu"
const FINANCE = "usr_lestari"

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

function financials(db: LocalDatabase, bookingId: string) {
  const snapshot = db.current().db
  const idx = getIndexes(snapshot)
  return bookingFinancials({
    booking: snapshot.bookings[bookingId],
    invoice: idx.invoiceByBooking.get(bookingId),
    payments: idx.paymentsByBooking.get(bookingId) ?? [],
    today: TODAY,
  })
}

describe("payments", () => {
  it("confirms a booking once a verified transfer covers the deposit", () => {
    const db = setup()
    const snapshot = db.current().db
    const payment = Object.values(snapshot.payments).find((p) => p.status === "pending_verification" && snapshot.bookings[p.bookingId].status === "awaiting_payment")!
    expectError(() => run(db, (uow) => verifyPayment(uow, SALES, payment.id)), "PERMISSION_DENIED")

    const result = run(db, (uow) => verifyPayment(uow, FINANCE, payment.id))
    const booking = db.current().db.bookings[payment.bookingId]
    expect(result.confirmed).toBe(true)
    expect(booking.status).toBe("confirmed")
    expect(booking.holdExpiresAt).toBeUndefined()
    expect(booking.confirmedAt).toBe(NOW)
    expect(getIndexes(db.current().db).activityBySubject.get(booking.id)!.some((e) => e.action === "booking.confirmed")).toBe(true)
    valid(db)
    expectError(() => run(db, (uow) => verifyPayment(uow, FINANCE, payment.id)), "INVALID_TRANSITION")
  })

  it("rejects a reported payment only with a reason, and it never counts", () => {
    const db = setup()
    const payment = Object.values(db.current().db.payments).find((p) => p.status === "pending_verification")!
    const before = financials(db, payment.bookingId)
    expectError(() => run(db, (uow) => rejectPayment(uow, FINANCE, payment.id, "  ")), "VALIDATION")
    run(db, (uow) => rejectPayment(uow, FINANCE, payment.id, "Nominal tidak ada di mutasi rekening"))
    const after = financials(db, payment.bookingId)
    expect(db.current().db.payments[payment.id]).toMatchObject({ status: "rejected", rejectionReason: "Nominal tidak ada di mutasi rekening" })
    expect(after.paidNet).toBe(before.paidNet)
    expect(after.pendingVerificationAmount).toBe(before.pendingVerificationAmount - payment.amount)
    valid(db)
  })

  it("records manual payments: sales waits for finance, finance verifies directly", () => {
    const db = setup()
    const snapshot = db.current().db
    const booking = Object.values(snapshot.bookings).find((b) => {
      if (b.status !== "awaiting_payment") return false
      return !(getIndexes(snapshot).paymentsByBooking.get(b.id) ?? []).some((p) => p.status === "pending_verification")
    })!
    const fin = financials(db, booking.id)
    const deposit = fin.nextInstallment!.remaining

    expectError(() => run(db, (uow) => recordPayment(uow, SALES, { bookingId: booking.id, amount: fin.outstanding + 1, method: "tunai", paidOn: TODAY })), "VALIDATION")
    expectError(() => run(db, (uow) => recordPayment(uow, SALES, { bookingId: booking.id, amount: deposit, method: "tunai", paidOn: "2026-10-21" })), "VALIDATION")

    const bySales = run(db, (uow) => recordPayment(uow, SALES, { bookingId: booking.id, amount: deposit, method: "tunai", paidOn: TODAY }))
    expect(bySales).toMatchObject({ verified: false, confirmed: false })
    expect(db.current().db.bookings[booking.id].status).toBe("awaiting_payment")
    // The reported amount is reserved, so nobody can record it twice.
    expectError(() => run(db, (uow) => recordPayment(uow, FINANCE, { bookingId: booking.id, amount: fin.outstanding, method: "transfer_bank", paidOn: TODAY })), "VALIDATION")

    run(db, (uow) => verifyPayment(uow, FINANCE, bySales.paymentId))
    expect(db.current().db.bookings[booking.id].status).toBe("confirmed")
    const rest = financials(db, booking.id).outstanding
    const byFinance = run(db, (uow) => recordPayment(uow, FINANCE, { bookingId: booking.id, amount: rest, method: "transfer_bank", paidOn: TODAY, reference: "MUT-001" }))
    expect(byFinance.verified).toBe(true)
    expect(financials(db, booking.id).status).toBe("paid")
    valid(db)
  })

  it("refuses payments on bookings that are not invoiced", () => {
    const db = setup()
    const pending = Object.values(db.current().db.bookings).find((b) => b.status === "pending")!
    expectError(() => run(db, (uow) => recordPayment(uow, FINANCE, { bookingId: pending.id, amount: 100_000, method: "tunai", paidOn: TODAY })), "INVALID_TRANSITION")
  })

  it("pays out a pending refund in parts, never beyond what the policy allows", () => {
    const db = setup()
    const booking = Object.values(db.current().db.bookings).find((b) => b.status === "cancelled" && financials(db, b.id).status === "refund_pending")!
    const due = financials(db, booking.id).refundRemaining
    expectError(() => run(db, (uow) => recordRefund(uow, SALES, { bookingId: booking.id, amount: due })), "PERMISSION_DENIED")
    expectError(() => run(db, (uow) => recordRefund(uow, FINANCE, { bookingId: booking.id, amount: due + 1 })), "VALIDATION")

    run(db, (uow) => recordRefund(uow, FINANCE, { bookingId: booking.id, amount: 100_000 }))
    expect(financials(db, booking.id)).toMatchObject({ status: "refund_pending", refundRemaining: due - 100_000 })
    run(db, (uow) => recordRefund(uow, FINANCE, { bookingId: booking.id, amount: due - 100_000, reference: "TRF-RFD" }))
    expect(financials(db, booking.id)).toMatchObject({ status: "refunded", refundRemaining: 0 })
    expectError(() => run(db, (uow) => recordRefund(uow, FINANCE, { bookingId: booking.id, amount: 1 })), "CONFLICT")
    valid(db)
  })

  it("sends the refund of a fresh cancellation to the refund queue", () => {
    const db = setup()
    const snapshot = db.current().db
    const confirmed = Object.values(snapshot.bookings).find((b) => b.status === "confirmed" && snapshot.departures[b.departureId].kind === "scheduled")!
    const quote = run(db, (uow) => cancelBooking(uow, OWNER, confirmed.id, { reason: "customer_request" }))
    expect(financials(db, confirmed.id).refundRemaining).toBe(quote.refund)
    if (quote.refund > 0) run(db, (uow) => recordRefund(uow, FINANCE, { bookingId: confirmed.id, amount: quote.refund }))
    valid(db)
  })
})

describe("trip operations", () => {
  it("enforces checklist dependencies on guide and vendors", () => {
    const db = setup()
    const departure = Object.values(db.current().db.departures).find((d) => d.startDate === "2026-11-05" && !d.guideId && !d.cancelledAt)!
    expectError(() => run(db, (uow) => setChecklistItem(uow, OPS, departure.id, "guide", true)), "VALIDATION")
    expectError(() => run(db, (uow) => setChecklistItem(uow, SALES, departure.id, "itinerary", true)), "PERMISSION_DENIED")
    run(db, (uow) => setChecklistItem(uow, OPS, departure.id, "itinerary", true))

    const guide = Object.values(db.current().db.guides).find((g) => g.status === "active" && !Object.values(db.current().db.departures).some((d) => d.guideId === g.id && !d.cancelledAt && d.startDate <= departure.endDate && d.endDate >= departure.startDate))!
    run(db, (uow) => assignGuide(uow, OPS, departure.id, guide.id))
    run(db, (uow) => setChecklistItem(uow, OPS, departure.id, "guide", true))

    expectError(() => run(db, (uow) => setChecklistItem(uow, OPS, departure.id, "transport", true)), "VALIDATION")
    const vendor = Object.values(db.current().db.vendors).find((v) => v.category === "kapal" || v.category === "transportasi")!
    const assignment = run(db, (uow) => assignVendor(uow, OPS, departure.id, { vendorId: vendor.id }))
    expectError(() => run(db, (uow) => assignVendor(uow, OPS, departure.id, { vendorId: vendor.id })), "CONFLICT")
    expectError(() => run(db, (uow) => setChecklistItem(uow, OPS, departure.id, "transport", true)), "VALIDATION")
    run(db, (uow) => setVendorAssignmentStatus(uow, OPS, assignment.id, "confirmed"))
    run(db, (uow) => setChecklistItem(uow, OPS, departure.id, "transport", true))

    const checklist = getIndexes(db.current().db).checklistByDeparture.get(departure.id)!
    expect(checklist.items.filter((i) => i.done).map((i) => i.key).sort()).toEqual(["guide", "itinerary", "transport"])
    valid(db)
  })

  it("reopens the manifest when traveler verification is reopened", () => {
    const db = setup()
    const departure = Object.values(db.current().db.departures).find((d) => d.startDate === "2026-10-27" && !d.cancelledAt)!
    const result = run(db, (uow) => setChecklistItem(uow, OPS, departure.id, "traveler_data", false))
    expect(result.reopened).toEqual(["Finalisasi manifest peserta"])
    const items = getIndexes(db.current().db).checklistByDeparture.get(departure.id)!.items
    expect(items.find((i) => i.key === "manifest")!.done).toBe(false)
    valid(db)
  })

  it("keeps a finished trip open until its checklist is complete", () => {
    // Seed today, then reopen the same data three days later, after the trip in progress ended.
    const storage = createMemoryStorage()
    new LocalDatabase({ storage, clock: { now: () => new Date(NOW) } }).load()
    const later = "2026-10-23T03:00:00.000Z"
    const db = new LocalDatabase({ storage, clock: { now: () => new Date(later) } })
    const snapshot = db.load().db
    const finished = Object.values(snapshot.bookings).find((b) => b.status === "confirmed" && snapshot.departures[b.departureId].endDate === "2026-10-21")!
    expect(finished).toBeDefined()

    run(db, (uow) => setChecklistItem(uow, OPS, finished.departureId, "briefing", false))
    expectError(() => run(db, (uow) => completeBooking(uow, OWNER, finished.id)), "INVALID_TRANSITION")
    run(db, (uow) => setChecklistItem(uow, OPS, finished.departureId, "briefing", true))
    run(db, (uow) => completeBooking(uow, OWNER, finished.id))
    expect(validateDatabase(db.current().db, later)).toEqual([])
  })
})

describe("costing", () => {
  it("replaces departure cost lines without touching the package template", () => {
    const db = setup()
    const departure = Object.values(db.current().db.departures).find((d) => d.startDate === "2026-11-01" && !d.cancelledAt)!
    const idx = getIndexes(db.current().db)
    const lines = idx.costItemsByDeparture.get(departure.id)!
    const templateBefore = idx.costItemsByPackage.get(departure.packageId)!.length
    const before = departureEstimate(db.current().db, departure)

    expectError(() => run(db, (uow) => saveCostItems(uow, SALES, { type: "departure", departureId: departure.id }, [])), "PERMISSION_DENIED")
    expectError(
      () => run(db, (uow) => saveCostItems(uow, FINANCE, { type: "departure", departureId: departure.id }, [{ category: "other", label: "", basis: "fixed", unitCost: 1, quantity: 1 }])),
      "VALIDATION",
    )
    const items = [
      ...lines.slice(1).map((l) => ({ id: l.id, category: l.category, label: l.label, basis: l.basis, unitCost: l.unitCost, quantity: l.quantity })),
      { category: "other" as const, label: "Biaya tak terduga", basis: "fixed" as const, unitCost: 1_000_000, quantity: 1 },
    ]
    run(db, (uow) => saveCostItems(uow, FINANCE, { type: "departure", departureId: departure.id }, items))
    const after = getIndexes(db.current().db)
    expect(after.costItemsByDeparture.get(departure.id)!.map((l) => l.label)).toContain("Biaya tak terduga")
    expect(after.costItemsByDeparture.get(departure.id)!.some((l) => l.id === lines[0].id)).toBe(false)
    expect(after.costItemsByPackage.get(departure.packageId)!.length).toBe(templateBefore)
    const removed = lines[0].unitCost * lines[0].quantity * (lines[0].basis === "per_pax" ? before.pax : 1)
    expect(departureEstimate(db.current().db, departure).cost).toBe(before.cost - removed + 1_000_000)
    valid(db)
  })

  it("computes realised profit only once every actual cost is recorded", () => {
    const db = setup()
    const departure = Object.values(db.current().db.departures).find((d) => d.startDate === "2026-09-05")!
    const partial = departureRealized(db.current().db, departure, TODAY)
    expect(partial.profit).toBeNull()
    expect(partial.pendingReason).toMatch(/Biaya aktual baru/)

    const upcoming = Object.values(db.current().db.departures).find((d) => d.startDate > TODAY && !d.cancelledAt)!
    const upcomingLine = getIndexes(db.current().db).costItemsByDeparture.get(upcoming.id)![0]
    expectError(() => run(db, (uow) => recordActualCosts(uow, FINANCE, upcoming.id, [{ id: upcomingLine.id, actualAmount: 1 }])), "INVALID_TRANSITION")

    const missing = getIndexes(db.current().db).costItemsByDeparture.get(departure.id)!.filter((l) => l.actualAmount === undefined)
    run(db, (uow) => recordActualCosts(uow, FINANCE, departure.id, missing.map((l) => ({ id: l.id, actualAmount: l.unitCost * l.quantity }))))
    const full = departureRealized(db.current().db, departure, TODAY)
    expect(full.pendingReason).toBeNull()
    expect(full.profit).toBe(full.revenue - full.actualCost)
    valid(db)
  })
})

describe("reports", () => {
  it("resolves period filters", () => {
    expect(reportRange("30d", TODAY)).toMatchObject({ from: "2026-09-21", to: TODAY })
    expect(reportRange("ytd", TODAY)).toMatchObject({ from: "2026-01-01", to: TODAY })
    expect(reportRange("custom", TODAY, { from: "2026-08-01", to: "2026-08-31" })).toMatchObject({ key: "custom", from: "2026-08-01" })
    expect(reportRange("custom", TODAY, { from: "2026-09-01", to: "2026-08-01" })).toMatchObject({ key: "30d" })
  })

  it("buckets every booking created in the period", () => {
    const db = setup()
    const snapshot = db.current().db
    for (const key of ["30d", "ytd"] as const) {
      const range = reportRange(key, TODAY)
      const trend = bookingTrendReport(snapshot, range)
      const created = Object.values(snapshot.bookings).filter((b) => {
        const date = toDateOnlyWIB(b.createdAt)
        return date >= range.from && date <= range.to
      })
      expect(created.length).toBeGreaterThan(0)
      expect(trend.buckets.reduce((sum, b) => sum + b.bookings + b.cancelled, 0)).toBe(created.length)
      expect(trend.unit).toBe(key === "30d" ? "week" : "month")
    }
  })

  it("ages exactly the outstanding balance of invoiced bookings", () => {
    const db = setup()
    const snapshot = db.current().db
    const aging = outstandingAging(snapshot, TODAY)
    const outstanding = Object.values(snapshot.bookings)
      .filter((b) => b.status === "awaiting_payment" || b.status === "confirmed")
      .reduce((sum, b) => sum + financials(db, b.id).outstanding, 0)
    expect(Object.values(aging.totals).reduce((a, b) => a + b, 0)).toBe(outstanding)
    expect(aging.totals["1_7"] + aging.totals["8_30"] + aging.totals.over_30).toBeGreaterThan(0)
  })

  it("keeps the lead funnel monotonic and profit estimates consistent", () => {
    const db = setup()
    const snapshot = db.current().db
    const leads = leadConversion(snapshot, reportRange("ytd", TODAY))
    const counts = leads.funnel.map((step) => step.count)
    expect([...counts].sort((a, b) => b - a)).toEqual(counts)
    expect(leads.won + leads.lost + leads.open).toBe(leads.total)

    const report = profitabilityReport(snapshot, reportRange("ytd", TODAY), TODAY)
    expect(report.estimated.profit).toBe(report.rows.reduce((sum, r) => sum + departureEstimate(snapshot, r.estimate.departure).profit, 0))
    expect(report.realized.departures).toBeGreaterThan(0)
    expect(report.rows.some((r) => r.realized.profit === null)).toBe(true)
  })
})
