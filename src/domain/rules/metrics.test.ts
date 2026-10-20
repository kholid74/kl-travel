import { describe, expect, it } from "vitest"
import { addDays, toDateOnlyWIB } from "@/lib/dates"
import { buildSeed } from "@/data/seed/build-seed"
import { getIndexes } from "../indexes"
import { costTotals } from "./costing"
import {
  bookingTrend,
  departureEstimate,
  followUpsDue,
  incompleteTravelers,
  overviewKpis,
  paymentsDue,
  periodRanges,
  popularPackages,
} from "./metrics"
import { priceTotal } from "./pricing"

const NOW = "2026-10-20T03:00:00.000Z"
const TODAY = "2026-10-20"
const db = buildSeed(NOW)

describe("overview metrics", () => {
  it("splits periods without gaps or overlap", () => {
    expect(periodRanges(TODAY, 30)).toEqual({
      current: { from: "2026-09-21", to: TODAY },
      previous: { from: "2026-08-22", to: "2026-09-20" },
    })
  })

  it("counts KPIs straight from the data", () => {
    const kpis = overviewKpis(db, NOW, 30)
    const { current } = periodRanges(TODAY, 30)
    const inPeriod = Object.values(db.bookings).filter((b) => {
      const date = toDateOnlyWIB(b.createdAt)
      return date >= current.from && date <= current.to && b.status !== "cancelled"
    })
    expect(kpis.bookings.value).toBe(inPeriod.length)
    expect(kpis.bookingValue.value).toBe(inPeriod.filter((b) => b.status === "confirmed" || b.status === "completed").reduce((s, b) => s + priceTotal(b), 0))
    expect(kpis.outstanding.amount).toBeGreaterThan(0)
    expect(kpis.outstanding.overdue).toBeLessThanOrEqual(kpis.outstanding.amount)
    expect(kpis.upcoming.departures).toBeGreaterThan(0)
    expect(kpis.profitability.departures).toBeGreaterThan(0)
  })

  it("reacts when a booking is added", () => {
    const before = overviewKpis(db, NOW, 30).bookings.value
    const copy = structuredClone(db)
    const template = Object.values(copy.bookings).find((b) => b.status === "pending")!
    copy.bookings.bk_new = { ...template, id: "bk_new", code: "NV-TEST", createdAt: NOW }
    expect(overviewKpis(copy, NOW, 30).bookings.value).toBe(before + 1)
  })

  it("estimates profit as confirmed revenue minus planned cost at confirmed pax", () => {
    const idx = getIndexes(db)
    const departure = Object.values(db.departures).find(
      (d) => d.startDate > TODAY && (idx.bookingsByDeparture.get(d.id) ?? []).some((b) => b.status === "confirmed"),
    )!
    const estimate = departureEstimate(db, departure)
    const totals = costTotals(idx.costItemsByDeparture.get(departure.id) ?? [])
    expect(estimate.cost).toBe(totals.fixed + totals.perPax * estimate.pax)
    expect(estimate.profit).toBe(estimate.revenue - estimate.cost)
  })
})

describe("overview widgets", () => {
  it("bins the booking trend by week", () => {
    const trend = bookingTrend(db, NOW, 12)
    expect(trend).toHaveLength(12)
    expect(trend[0].weekStart < trend[11].weekStart).toBe(true)
    expect(new Date(`${trend[0].weekStart}T00:00:00Z`).getUTCDay()).toBe(1)
    const counted = Object.values(db.bookings).filter((b) => {
      const date = toDateOnlyWIB(b.createdAt)
      return b.status !== "cancelled" && date >= trend[0].weekStart && date <= TODAY
    }).length
    expect(trend.reduce((sum, p) => sum + p.bookings, 0)).toBe(counted)
  })

  it("ranks packages by travelers", () => {
    const rows = popularPackages(db, NOW, 90, 5)
    expect(rows.length).toBeGreaterThan(0)
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].pax).toBeGreaterThanOrEqual(rows[i].pax)
  })

  it("lists follow-ups, due payments, and incomplete traveler data", () => {
    const follow = followUpsDue(db, NOW)
    expect(follow.length).toBeGreaterThan(0)
    expect(follow.every((f) => f.inquiry.stage !== "won" && f.inquiry.stage !== "lost")).toBe(true)

    const due = paymentsDue(db, NOW, 7)
    expect(due.length).toBeGreaterThan(0)
    expect(due.every((d) => d.remaining > 0 && d.installment.dueDate <= addDays(TODAY, 7))).toBe(true)
    expect(due.some((d) => d.overdue)).toBe(true)

    const incomplete = incompleteTravelers(db, NOW, 30)
    expect(incomplete.length).toBeGreaterThan(0)
    expect(incomplete.every((i) => i.missing > 0 && i.missing <= i.pax)).toBe(true)
  })
})
