import { rangesOverlap, toDateOnlyWIB, type Timestamp } from "@/lib/dates"
import type { DemoDatabase } from "../database"
import { getIndexes } from "../indexes"
import { seatSummary } from "./availability"
import { bookingFinancials } from "./payment-status"
import { priceTotal } from "./pricing"

/**
 * Checks the invariants in docs/domain-model.md §8. Returns human-readable
 * violations; an empty array means the database is consistent.
 */
export function validateDatabase(db: DemoDatabase, now: Timestamp): string[] {
  const issues: string[] = []
  const idx = getIndexes(db)
  const today = toDateOnlyWIB(now)
  const has = (table: Record<string, unknown>, id: string | undefined) => !id || id in table

  // 1. referential integrity
  for (const pkg of Object.values(db.packages)) {
    if (!has(db.destinations, pkg.destinationId)) issues.push(`package ${pkg.id}: destination ${pkg.destinationId} missing`)
  }
  for (const dep of Object.values(db.departures)) {
    if (!has(db.packages, dep.packageId)) issues.push(`departure ${dep.id}: package missing`)
    if (!has(db.guides, dep.guideId)) issues.push(`departure ${dep.id}: guide missing`)
  }
  for (const b of Object.values(db.bookings)) {
    if (!has(db.customers, b.customerId)) issues.push(`booking ${b.code}: customer missing`)
    if (!has(db.packages, b.packageId)) issues.push(`booking ${b.code}: package missing`)
    if (!has(db.departures, b.departureId)) issues.push(`booking ${b.code}: departure missing`)
    if (!has(db.inquiries, b.inquiryId)) issues.push(`booking ${b.code}: inquiry missing`)
    if (!has(db.quotations, b.quotationId)) issues.push(`booking ${b.code}: quotation missing`)
  }
  for (const bt of Object.values(db.bookingTravelers)) {
    if (!has(db.bookings, bt.bookingId) || !has(db.travelers, bt.travelerId)) issues.push(`bookingTraveler ${bt.id}: dangling`)
  }
  for (const p of Object.values(db.payments)) {
    if (!has(db.bookings, p.bookingId)) issues.push(`payment ${p.code}: booking missing`)
  }
  for (const inv of Object.values(db.invoices)) {
    if (!has(db.bookings, inv.bookingId)) issues.push(`invoice ${inv.number}: booking missing`)
  }
  for (const inq of Object.values(db.inquiries)) {
    if (!has(db.customers, inq.customerId)) issues.push(`inquiry ${inq.code}: customer missing`)
    if (!has(db.packages, inq.packageId)) issues.push(`inquiry ${inq.code}: package missing`)
    if (!has(db.users, inq.assigneeId)) issues.push(`inquiry ${inq.code}: assignee missing`)
  }
  for (const q of Object.values(db.quotations)) {
    if (!has(db.inquiries, q.inquiryId)) issues.push(`quotation ${q.code}: inquiry missing`)
  }
  for (const user of Object.values(db.users)) {
    if (!has(db.roles, user.roleId)) issues.push(`user ${user.id}: role missing`)
  }

  for (const dep of Object.values(db.departures)) {
    const bookings = idx.bookingsByDeparture.get(dep.id) ?? []
    // 2. capacity
    const seats = seatSummary(dep, bookings, idx.paxOf, now)
    if (seats.allocated + seats.held > dep.capacity) {
      issues.push(`departure ${dep.code}: ${seats.allocated}+${seats.held} seats exceed capacity ${dep.capacity}`)
    }
    // 3. a private departure holds exactly one active booking, or none once cancelled
    if (dep.kind === "private") {
      const active = bookings.filter((b) => b.status !== "cancelled")
      const expected = dep.cancelledAt ? 0 : 1
      if (active.length !== expected) issues.push(`private departure ${dep.code}: ${active.length} active bookings`)
    }
    // 11. guide double-booking
    if (dep.guideId && !dep.cancelledAt) {
      for (const other of Object.values(db.departures)) {
        if (other.id <= dep.id || other.guideId !== dep.guideId || other.cancelledAt) continue
        if (rangesOverlap(dep.startDate, dep.endDate, other.startDate, other.endDate)) {
          issues.push(`guide ${dep.guideId}: overlaps ${dep.code} and ${other.code}`)
        }
      }
    }
    // 13. completed departures with completed bookings have a full checklist
    const completedBookings = bookings.filter((b) => b.status === "completed")
    if (completedBookings.length && today > dep.endDate) {
      const checklist = idx.checklistByDeparture.get(dep.id)
      if (!checklist || checklist.items.some((item) => !item.done)) {
        issues.push(`departure ${dep.code}: finished trip with incomplete checklist`)
      }
    }
  }

  for (const b of Object.values(db.bookings)) {
    const dep = db.departures[b.departureId]
    const pax = idx.paxOf(b.id)
    // 3. package consistency
    if (dep && dep.packageId !== b.packageId) issues.push(`booking ${b.code}: package differs from departure`)
    if (pax === 0) issues.push(`booking ${b.code}: no travelers`)
    // 4. per-pax lines match pax (the first line is the trip line)
    const tripLine = b.lines[0]
    if (b.tripType === "open" && tripLine && tripLine.quantity !== pax) {
      issues.push(`booking ${b.code}: trip line quantity ${tripLine.quantity} ≠ pax ${pax}`)
    }
    // 5. totals and invoice
    const total = priceTotal(b)
    const invoice = idx.invoiceByBooking.get(b.id)
    if (invoice) {
      if (priceTotal(invoice) !== total) issues.push(`booking ${b.code}: invoice total differs`)
      const sum = invoice.installments.reduce((s, i) => s + i.amount, 0)
      if (sum !== total) issues.push(`booking ${b.code}: installments ${sum} ≠ total ${total}`)
    }
    const fin = bookingFinancials({ booking: b, invoice, payments: idx.paymentsByBooking.get(b.id) ?? [], today })
    // 6. no overpayment / over-refund
    if (fin.paidIn > total) issues.push(`booking ${b.code}: paid ${fin.paidIn} exceeds total ${total}`)
    if (b.status === "cancelled" && fin.refunded > fin.refundDue) issues.push(`booking ${b.code}: refunded more than due`)
    // 7. status coherence
    switch (b.status) {
      case "pending":
        if (invoice) issues.push(`booking ${b.code}: pending but invoiced`)
        if (fin.paidNet > 0) issues.push(`booking ${b.code}: pending with verified payments`)
        break
      case "awaiting_payment":
        if (!invoice) issues.push(`booking ${b.code}: awaiting payment without invoice`)
        if (fin.paidNet >= fin.firstInstallmentAmount) issues.push(`booking ${b.code}: awaiting payment but deposit covered`)
        break
      case "confirmed":
        if (!invoice) issues.push(`booking ${b.code}: confirmed without invoice`)
        if (fin.paidNet < fin.firstInstallmentAmount) issues.push(`booking ${b.code}: confirmed below deposit`)
        break
      case "completed":
        if (fin.status !== "paid") issues.push(`booking ${b.code}: completed but not paid`)
        if (dep && today <= dep.endDate) issues.push(`booking ${b.code}: completed before trip ended`)
        break
      case "cancelled":
        if (!b.cancellation) issues.push(`booking ${b.code}: cancelled without cancellation record`)
        break
    }
    // 8. holds only on unconfirmed bookings
    const needsHold = b.status === "pending" || b.status === "awaiting_payment"
    if (needsHold !== !!b.holdExpiresAt) issues.push(`booking ${b.code}: hold field inconsistent with ${b.status}`)
  }

  // 9. unique customer identity
  const phones = new Set<string>()
  const emails = new Set<string>()
  for (const c of Object.values(db.customers)) {
    if (phones.has(c.phone)) issues.push(`customer ${c.code}: duplicate phone`)
    phones.add(c.phone)
    if (c.email) {
      if (emails.has(c.email)) issues.push(`customer ${c.code}: duplicate email`)
      emails.add(c.email)
    }
  }

  // 10. won inquiries & conversion links
  for (const inq of Object.values(db.inquiries)) {
    const quotes = idx.quotationsByInquiry.get(inq.id) ?? []
    if (inq.stage === "won" && inq.type !== "general" && !quotes.some((q) => q.status === "accepted")) {
      issues.push(`inquiry ${inq.code}: won without accepted quotation`)
    }
    if (inq.convertedBookingId && db.bookings[inq.convertedBookingId]?.inquiryId !== inq.id) {
      issues.push(`inquiry ${inq.code}: conversion link broken`)
    }
  }

  // 12. published packages are complete
  for (const pkg of Object.values(db.packages)) {
    if (pkg.status !== "published" || pkg.visibility !== "catalog") continue
    if (!pkg.itinerary.length) issues.push(`package ${pkg.code}: published without itinerary`)
    if (!pkg.coverMediaId) issues.push(`package ${pkg.code}: published without cover`)
    if (pkg.pricing.kind === "quoted") issues.push(`package ${pkg.code}: catalog package without price`)
    if (db.destinations[pkg.destinationId]?.status !== "published") issues.push(`package ${pkg.code}: destination not published`)
  }

  return issues
}
