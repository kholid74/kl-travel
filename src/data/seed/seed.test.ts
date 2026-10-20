import { describe, expect, it } from "vitest"
import { addHours, diffDays, rangesOverlap, toDateOnlyWIB } from "@/lib/dates"
import type { DemoDatabase } from "@/domain/database"
import { getIndexes } from "@/domain/indexes"
import { departureDisplayStatus, isHoldActive, seatSummary } from "@/domain/rules/availability"
import { costTotals, profitAt, realizedCost } from "@/domain/rules/costing"
import { customerStage } from "@/domain/rules/customer-identity"
import { quotationDisplayStatus } from "@/domain/rules/inquiry-pipeline"
import { bookingFinancials } from "@/domain/rules/payment-status"
import { isTravelerComplete } from "@/domain/rules/travelers"
import { validateDatabase } from "@/domain/rules/validate-database"
import { CATALOG_PACKAGES } from "../fixtures/packages"
import { buildSeed } from "./build-seed"

const NOWS = [
  "2026-10-20T01:00:00.000Z", // 08.00 WIB
  "2026-10-20T16:45:00.000Z", // 23.45 WIB
  "2026-12-31T22:30:00.000Z", // 05.30 WIB on 1 Jan
  "2027-03-15T07:00:00.000Z",
]

function context(db: DemoDatabase, now: string) {
  const idx = getIndexes(db)
  const today = toDateOnlyWIB(now)
  const financials = (bookingId: string) =>
    bookingFinancials({
      booking: db.bookings[bookingId],
      invoice: idx.invoiceByBooking.get(bookingId),
      payments: idx.paymentsByBooking.get(bookingId) ?? [],
      today,
    })
  const seats = (departureId: string) =>
    seatSummary(db.departures[departureId], idx.bookingsByDeparture.get(departureId) ?? [], idx.paxOf, now)
  return { idx, today, financials, seats }
}

describe.each(NOWS)("seed built at %s", (now) => {
  const db = buildSeed(now)
  const { idx, today, financials, seats } = context(db, now)
  const bookings = Object.values(db.bookings)
  const departures = Object.values(db.departures)

  it("satisfies every invariant", () => {
    expect(validateDatabase(db, now)).toEqual([])
  })

  it("never dates anything in the future", () => {
    const limit = Date.parse(now)
    const stamps = [
      ...bookings.map((b) => b.createdAt),
      ...Object.values(db.payments).map((p) => p.paidAt),
      ...Object.values(db.activity).map((a) => a.at),
      ...Object.values(db.customers).map((c) => c.createdAt),
      ...Object.values(db.inquiries).map((i) => i.createdAt),
    ]
    expect(stamps.filter((s) => Date.parse(s) > limit)).toEqual([])
  })

  it("has the planned volume", () => {
    expect(Object.keys(db.destinations)).toHaveLength(8)
    expect(Object.keys(db.packages)).toHaveLength(20)
    expect(departures).toHaveLength(27)
    expect(bookings.length).toBeGreaterThanOrEqual(60)
    expect(bookings.length).toBeLessThanOrEqual(80)
    expect(Object.keys(db.customers).length).toBeGreaterThanOrEqual(55)
    expect(Object.keys(db.customers).length).toBeLessThanOrEqual(80)
    expect(Object.keys(db.inquiries)).toHaveLength(26)
    expect(JSON.stringify(db).length).toBeLessThan(1_200_000)
  })

  it("covers every booking and payment status", () => {
    for (const status of ["pending", "awaiting_payment", "confirmed", "completed", "cancelled"]) {
      expect(bookings.some((b) => b.status === status)).toBe(true)
    }
    const paymentStatuses = new Set(bookings.map((b) => financials(b.id).status))
    for (const status of ["paid", "partially_paid", "overdue", "unpaid", "refund_pending", "refunded", "closed"]) {
      expect(paymentStatuses).toContain(status)
    }
    expect(bookings.some((b) => financials(b.id).hasPendingVerification)).toBe(true)
  })

  it("covers departure scenarios", () => {
    const statuses = departures.map((d) => {
      const pkg = db.packages[d.packageId]
      return departureDisplayStatus({ departure: d, seats: seats(d.id), today, settings: db.settings.booking, packageArchived: pkg.status === "archived" })
    })
    for (const status of ["open", "limited", "full", "closed", "departed", "completed", "cancelled"]) expect(statuses).toContain(status)
    const fullByHolds = departures.some((d) => {
      const s = seats(d.id)
      return s.available === 0 && s.held > 0
    })
    expect(fullByHolds).toBe(true)
    expect(departures.some((d) => seats(d.id).allocated === d.capacity)).toBe(true)
  })

  it("covers sales, finance and operations scenarios", () => {
    const holdHours = bookings
      .filter((b) => isHoldActive(b, now))
      .map((b) => (Date.parse(b.holdExpiresAt!) - Date.parse(now)) / 3_600_000)
    expect(holdHours.some((h) => h < 6)).toBe(true)
    expect(bookings.some((b) => b.cancellation?.reason === "hold_expired")).toBe(true)

    const soon = departures.filter((d) => diffDays(d.startDate, today) >= 0 && diffDays(d.startDate, today) <= 30)
    const incomplete = soon.some((d) =>
      (idx.bookingsByDeparture.get(d.id) ?? [])
        .filter((b) => b.status !== "cancelled")
        .some((b) => (idx.bookingTravelersByBooking.get(b.id) ?? []).some((bt) => !isTravelerComplete(db.travelers[bt.travelerId]))),
    )
    expect(incomplete).toBe(true)

    const stages = Object.values(db.customers).map((c) => customerStage(idx.bookingsByCustomer.get(c.id) ?? []))
    expect(stages).toContain("prospect")
    expect(stages).toContain("repeat")

    const inquiries = Object.values(db.inquiries)
    expect(inquiries.some((i) => i.stage === "lost" && i.lostReason)).toBe(true)
    expect(inquiries.some((i) => i.stage === "won" && !i.convertedBookingId)).toBe(true)
    expect(inquiries.filter((i) => i.convertedBookingId)).toHaveLength(5)
    const quotations = Object.values(db.quotations)
    expect(quotations.some((q) => q.version > 1)).toBe(true)
    expect(quotations.some((q) => quotationDisplayStatus(q, today) === "expired")).toBe(true)

    const pkgs = Object.values(db.packages)
    expect(pkgs.some((p) => p.status === "draft")).toBe(true)
    expect(pkgs.some((p) => p.status === "archived")).toBe(true)
    expect(pkgs.filter((p) => p.tripType === "custom" && p.visibility === "unlisted")).toHaveLength(2)
  })

  it("covers profitability scenarios", () => {
    const estimate = (depId: string) => {
      const dep = db.departures[depId]
      const totals = costTotals(idx.costItemsByDeparture.get(depId) ?? [])
      const pkg = db.packages[dep.packageId]
      const price = dep.pricePerPaxOverride ?? (pkg.pricing.kind === "per_pax" ? pkg.pricing.pricePerPax : 0)
      return profitAt({ ...totals, pricePerPax: price, participants: seats(depId).allocated })
    }
    const upcoming = departures.filter((d) => d.kind === "scheduled" && !d.cancelledAt && d.startDate > today && seats(d.id).allocated > 0)
    expect(upcoming.some((d) => estimate(d.id).profit < 0)).toBe(true)
    expect(upcoming.some((d) => (estimate(d.id).margin ?? 0) > 0.25)).toBe(true)

    const finished = departures.filter((d) => d.endDate < today && !d.cancelledAt)
    const realized = finished.map((d) => realizedCost(idx.costItemsByDeparture.get(d.id) ?? []).complete)
    expect(realized).toContain(true)
    expect(realized).toContain(false)
  })

  it("keeps the guide-conflict demo available", () => {
    const sailing = departures.find((d) => d.packageId === "pkg_lbj_sailing_3h2m" && d.guideId === "gde_kornelis" && d.startDate > today)!
    const daytrip = departures.find((d) => d.packageId === "pkg_lbj_daytrip_speedboat" && d.startDate > today)!
    expect(daytrip.guideId).toBeUndefined()
    expect(rangesOverlap(sailing.startDate, sailing.endDate, daytrip.startDate, daytrip.endDate)).toBe(true)
  })
})

describe("seed determinism", () => {
  it("produces identical data for the same moment", () => {
    expect(buildSeed(NOWS[0])).toEqual(buildSeed(NOWS[0]))
  })

  it("shifts dates with the anchor while keeping the story", () => {
    const a = buildSeed("2026-10-20T03:00:00.000Z")
    const b = buildSeed(addHours("2026-10-20T03:00:00.000Z", 24 * 30))
    expect(Object.keys(a.bookings).length).toBe(Object.keys(b.bookings).length)
    const firstA = Object.values(a.departures)[0]
    const firstB = Object.values(b.departures)[0]
    expect(diffDays(firstB.startDate, firstA.startDate)).toBe(30)
  })
})

describe("package cost templates (docs/seed-data.md §3)", () => {
  const expected: Record<string, [number, number]> = {
    pkg_lbj_sailing_3h2m: [18_500_000, 1_150_000],
    pkg_lbj_daytrip_speedboat: [6_500_000, 550_000],
    pkg_np_west_snorkeling_1h: [2_500_000, 475_000],
    pkg_lbk_gili_3h2m: [5_800_000, 1_250_000],
    pkg_lbk_rinjani_3h2m: [4_800_000, 1_450_000],
    pkg_ra_wayag_piaynemo_5h4m: [46_000_000, 4_100_000],
    pkg_brm_sunrise_1h: [2_700_000, 165_000],
    pkg_brm_ijen_3h2m: [6_200_000, 950_000],
    pkg_yog_heritage_3h2m: [4_500_000, 890_000],
    pkg_blt_island_hopping_3h2m: [5_400_000, 980_000],
    pkg_bali_munduk_2h1m: [3_200_000, 760_000],
    pkg_lbj_private_phinisi_4h3m: [24_000_000, 1_500_000],
    pkg_bali_ubud_sidemen_4h3m: [6_500_000, 2_600_000],
    pkg_bali_honeymoon_5h4m: [4_200_000, 7_900_000],
    pkg_np_private_2h1m: [2_400_000, 1_050_000],
    pkg_ra_private_liveaboard_6h5m: [85_000_000, 3_500_000],
    pkg_yog_family_4h3m: [5_600_000, 1_450_000],
    pkg_blt_east_retreat_3h2m: [4_900_000, 1_700_000],
  }

  it.each(CATALOG_PACKAGES.map((p) => [p.id, p] as const))("%s matches F and v", (id, pkg) => {
    const totals = costTotals(pkg.costTemplate)
    expect([totals.fixed, totals.perPax]).toEqual(expected[id])
  })
})
