/**
 * Phase 6 consistency check: a long, seeded-random run of the demo through every write
 * use case, with the clock moving forward and the system job running in between.
 * validateDatabase() must stay empty after every committed step (docs/domain-model.md §8).
 */
import { describe, expect, it } from "vitest"
import { addDays, toDateOnlyWIB } from "@/lib/dates"
import { createRng } from "@/lib/prng"
import { DomainError } from "@/lib/result"
import type { DemoDatabase } from "@/domain/database"
import { getIndexes } from "@/domain/indexes"
import { bookingFinancials } from "@/domain/rules/payment-status"
import { checklistBlocker } from "@/domain/rules/trip-readiness"
import { validateDatabase } from "@/domain/rules/validate-database"
import { LocalDatabase } from "@/repositories/mock/local-database"
import { createMemoryStorage } from "@/repositories/mock/storage"
import type { UnitOfWork } from "@/repositories"
import { approveBooking, cancelBooking, extendHold } from "./booking-admin-service"
import { placeWebsiteBooking, recordPaymentConfirmation } from "./booking-service"
import { recordActualCosts } from "./costing-service"
import { cancelDeparture, updateDeparture } from "./departure-service"
import { convertInquiry, respondQuotation, saveQuotation } from "./inquiry-admin-service"
import { placeWebsiteInquiry } from "./inquiry-service"
import { assignVendor, setChecklistItem, setVendorAssignmentStatus } from "./operations-service"
import { recordPayment, recordRefund, rejectPayment, verifyPayment } from "./payment-service"
import { operationsRow } from "./queries/operations"
import { upcomingDepartures } from "./queries/catalog"
import { runSystemJobs } from "./system-jobs"

const START = Date.parse("2026-10-20T02:00:00.000Z")
const OWNER = "usr_rania"
const SALES = "usr_dimas"
const OPS = "usr_bayu"
const FINANCE = "usr_lestari"
const STEPS = 400

describe("long demo scenario", () => {
  it("keeps every invariant through hundreds of mixed actions over six weeks", () => {
    const rng = createRng("phase-6-scenario")
    let clock = START
    const db = new LocalDatabase({ storage: createMemoryStorage(), clock: { now: () => new Date(clock) } })
    db.load()
    const snapshot = (): DemoDatabase => db.current().db
    const now = () => new Date(clock).toISOString()
    const today = () => toDateOnlyWIB(now())
    const done: Record<string, number> = {}
    const rejected: Record<string, number> = {}

    const act = (name: string, work: (uow: UnitOfWork) => unknown) => {
      try {
        db.transaction(work)
        done[name] = (done[name] ?? 0) + 1
      } catch (error) {
        if (!(error instanceof DomainError)) throw error
        rejected[name] = (rejected[name] ?? 0) + 1
      }
      const issues = validateDatabase(snapshot(), now())
      if (issues.length) throw new Error(`after ${name} at ${now()}: ${issues.join("; ")}`)
    }

    const bookingsWhere = (status: string) => Object.values(snapshot().bookings).filter((b) => b.status === status)
    const fin = (bookingId: string) => {
      const s = snapshot()
      const idx = getIndexes(s)
      return bookingFinancials({ booking: s.bookings[bookingId], invoice: idx.invoiceByBooking.get(bookingId), payments: idx.paymentsByBooking.get(bookingId) ?? [], today: today() })
    }

    const actions: [string, number, () => void][] = [
      [
        "website booking",
        6,
        () => {
          const options = upcomingDepartures(snapshot(), now(), 30).filter((o) => o.seats.available > 0)
          if (!options.length) return
          const option = rng.pick(options)
          const pax = rng.int(1, Math.min(3, option.seats.available))
          const n = rng.int(1000, 9999)
          act("website booking", (uow) =>
            placeWebsiteBooking(uow, {
              packageId: option.pkg.id,
              departureId: option.departure.id,
              contact: { fullName: `Tamu ${n}`, phone: `0812${String(n).padStart(4, "0")}${rng.int(1000, 9999)}`, email: `tamu${n}@example.com` },
              contactTravels: true,
              travelers: Array.from({ length: pax }, (_, i) => ({ fullName: i ? `Peserta ${n}-${i}` : `Tamu ${n}` })),
            }),
          )
        },
      ],
      ["approve", 5, () => bookingsWhere("pending").length && act("approve", (uow) => approveBooking(uow, SALES, rng.pick(bookingsWhere("pending")).id))],
      ["extend hold", 1, () => bookingsWhere("awaiting_payment").length && act("extend hold", (uow) => extendHold(uow, SALES, rng.pick(bookingsWhere("awaiting_payment")).id))],
      [
        "customer transfer",
        5,
        () => {
          const list = bookingsWhere("awaiting_payment").concat(bookingsWhere("confirmed"))
          if (!list.length) return
          const booking = rng.pick(list)
          const f = fin(booking.id)
          const amount = f.nextInstallment ? Math.min(f.nextInstallment.remaining, f.outstanding - f.pendingVerificationAmount) : 0
          if (amount > 0) act("customer transfer", (uow) => recordPaymentConfirmation(uow, { bookingId: booking.id, amount, method: "transfer_bank", senderName: "Pengirim" }))
        },
      ],
      [
        "verify or reject",
        6,
        () => {
          const pending = Object.values(snapshot().payments).filter((p) => p.status === "pending_verification")
          if (!pending.length) return
          const payment = rng.pick(pending)
          if (rng.chance(0.85)) act("verify", (uow) => verifyPayment(uow, FINANCE, payment.id))
          else act("reject", (uow) => rejectPayment(uow, FINANCE, payment.id, "Tidak ada di mutasi"))
        },
      ],
      [
        "manual payment",
        3,
        () => {
          const list = bookingsWhere("confirmed").filter((b) => fin(b.id).outstanding - fin(b.id).pendingVerificationAmount > 0)
          if (!list.length) return
          const booking = rng.pick(list)
          const f = fin(booking.id)
          act("manual payment", (uow) =>
            recordPayment(uow, rng.chance(0.5) ? FINANCE : SALES, { bookingId: booking.id, amount: f.outstanding - f.pendingVerificationAmount, method: "tunai", paidOn: today() }),
          )
        },
      ],
      [
        "cancel booking",
        2,
        () => {
          const list = [...bookingsWhere("confirmed"), ...bookingsWhere("awaiting_payment"), ...bookingsWhere("pending")]
          if (list.length) act("cancel booking", (uow) => cancelBooking(uow, OWNER, rng.pick(list).id, { reason: "customer_request" }))
        },
      ],
      [
        "refund",
        2,
        () => {
          const list = bookingsWhere("cancelled").filter((b) => fin(b.id).refundRemaining > 0)
          if (!list.length) return
          const booking = rng.pick(list)
          const remaining = fin(booking.id).refundRemaining
          act("refund", (uow) => recordRefund(uow, FINANCE, { bookingId: booking.id, amount: rng.chance(0.5) ? remaining : Math.max(1, Math.floor(remaining / 2)) }))
        },
      ],
      [
        "capacity",
        2,
        () => {
          const options = upcomingDepartures(snapshot(), now(), 30)
          if (!options.length) return
          const option = rng.pick(options)
          const capacity = option.departure.capacity + rng.int(-3, 3)
          act("capacity", (uow) => updateDeparture(uow, OPS, option.departure.id, { capacity }))
        },
      ],
      [
        "cancel departure",
        0.3,
        () => {
          const options = upcomingDepartures(snapshot(), now(), 30).filter((o) => o.departure.startDate > addDays(today(), 10))
          if (options.length) act("cancel departure", (uow) => cancelDeparture(uow, OPS, rng.pick(options).departure.id, "Simulasi skenario panjang"))
        },
      ],
      [
        "private request to booking",
        1.5,
        () => {
          const pkg = rng.pick(Object.values(snapshot().packages).filter((p) => p.tripType === "private" && p.status === "published"))
          const n = rng.int(1000, 9999)
          const start = addDays(today(), rng.int(20, 60))
          let inquiryId = ""
          act("private inquiry", (uow) => {
            inquiryId = placeWebsiteInquiry(uow, {
              type: "private",
              contact: { fullName: `Grup ${n}`, phone: `0813${n}${rng.int(1000, 9999)}`, email: `grup${n}@example.com` },
              packageId: pkg.id,
              travelDates: { kind: "exact", startDate: start },
              groupSize: rng.int(2, 6),
            }).inquiryId
          })
          if (!inquiryId) return
          const inquiry = snapshot().inquiries[inquiryId]
          act("quotation", (uow) =>
            saveQuotation(
              uow,
              SALES,
              inquiryId,
              {
                title: pkg.title,
                packageId: pkg.id,
                proposedStartDate: start,
                durationDays: pkg.durationDays,
                groupSize: inquiry.groupSize,
                lines: [{ label: pkg.title, quantity: inquiry.groupSize, unitPrice: 2_500_000 }],
                discount: 0,
                itinerarySummary: ["Hari 1"],
                validDays: 7,
              },
              { send: true },
            ),
          )
          const quotation = Object.values(snapshot().quotations).find((q) => q.inquiryId === inquiryId && q.status === "sent")
          if (!quotation) return
          act("accept quotation", (uow) => respondQuotation(uow, SALES, quotation.id, "accepted"))
          act("convert", (uow) => convertInquiry(uow, OWNER, inquiryId))
        },
      ],
      [
        "operations",
        3,
        () => {
          const s = snapshot()
          const departures = Object.values(s.departures).filter((d) => !d.cancelledAt && d.endDate >= today())
          if (!departures.length) return
          const departure = rng.pick(departures)
          const row = operationsRow(s, departure, now(), today())
          const vendor = rng.pick(Object.values(s.vendors))
          if (rng.chance(0.4)) act("assign vendor", (uow) => assignVendor(uow, OPS, departure.id, { vendorId: vendor.id }))
          const requested = row.vendors.find((v) => v.status === "requested")
          if (requested) act("confirm vendor", (uow) => setVendorAssignmentStatus(uow, OPS, requested.id, rng.chance(0.8) ? "confirmed" : "cancelled"))
          const item = row.checklist?.items.find((i) => !i.done && !checklistBlocker(i.key, row.context))
          if (item) act("tick checklist", (uow) => setChecklistItem(uow, OPS, departure.id, item.key, true))
        },
      ],
      [
        "actual costs",
        1,
        () => {
          const s = snapshot()
          const finished = Object.values(s.departures).filter((d) => !d.cancelledAt && d.startDate <= today())
          if (!finished.length) return
          const departure = rng.pick(finished)
          const lines = getIndexes(s).costItemsByDeparture.get(departure.id) ?? []
          if (lines.length) act("actual costs", (uow) => recordActualCosts(uow, FINANCE, departure.id, lines.map((l) => ({ id: l.id, actualAmount: l.unitCost * l.quantity }))))
        },
      ],
    ]
    const totalWeight = actions.reduce((sum, [, w]) => sum + w, 0)

    for (let step = 0; step < STEPS; step++) {
      let roll = rng.next() * totalWeight
      const action = actions.find(([, w]) => (roll -= w) < 0) ?? actions[0]
      action[2]()
      clock += rng.int(1, 6) * 3_600_000 // one to six hours later
      runSystemJobs(db, new Date(clock))
      const issues = validateDatabase(snapshot(), now())
      if (issues.length) throw new Error(`after system job at ${now()}: ${issues.join("; ")}`)
    }

    // The run covered the main paths, not just the rejections.
    for (const name of ["website booking", "approve", "customer transfer", "verify", "manual payment", "cancel booking", "refund", "private inquiry", "convert", "tick checklist"]) {
      expect(done[name] ?? 0, `${name} succeeded at least once`).toBeGreaterThan(0)
    }
    expect(today() > "2026-11-20").toBe(true)
    expect(Object.values(snapshot().activity).some((e) => e.actor.kind === "system" && e.at > new Date(START).toISOString())).toBe(true)
  }, 120_000)
})
