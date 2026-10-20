/**
 * Dashboard metrics (docs/domain-model.md §7). Pure functions over one snapshot; every
 * number on the overview comes from here, nothing is stored or hardcoded.
 */
import { addDays, diffDays, toDateOnlyWIB, type DateOnly, type Timestamp } from "@/lib/dates"
import type { DemoDatabase } from "../database"
import type { Booking, Departure, Inquiry, Installment, TourPackage } from "../entities"
import { getIndexes } from "../indexes"
import type { ID, IDR } from "../types/common"
import { seatSummary } from "./availability"
import { costTotals, profitAt, realizedCost } from "./costing"
import { bookingFinancials } from "./payment-status"
import { priceTotal } from "./pricing"
import { isTravelerComplete } from "./travelers"
import { tripReadiness, type TripReadiness } from "./trip-readiness"

export interface PeriodRange {
  from: DateOnly
  to: DateOnly
}

/** The last `days` days including today, and the same length before it. */
export function periodRanges(today: DateOnly, days: number): { current: PeriodRange; previous: PeriodRange } {
  return {
    current: { from: addDays(today, -(days - 1)), to: today },
    previous: { from: addDays(today, -(2 * days - 1)), to: addDays(today, -days) },
  }
}

const inRange = (at: Timestamp, range: PeriodRange) => {
  const date = toDateOnlyWIB(at)
  return date >= range.from && date <= range.to
}

export interface Comparison {
  value: number
  previous: number
  /** Relative change; null when the previous period was 0. */
  change: number | null
}

function compare(value: number, previous: number): Comparison {
  return { value, previous, change: previous === 0 ? null : (value - previous) / previous }
}

export interface DepartureEstimate {
  departure: Departure
  pax: number
  revenue: IDR
  cost: IDR
  profit: IDR
}

/** Estimated gross profit: confirmed revenue against planned cost at the confirmed pax (§6.10). */
export function departureEstimate(db: DemoDatabase, departure: Departure): DepartureEstimate {
  const idx = getIndexes(db)
  const bookings = (idx.bookingsByDeparture.get(departure.id) ?? []).filter((b) => b.status === "confirmed" || b.status === "completed")
  const pax = bookings.reduce((sum, b) => sum + idx.paxOf(b.id), 0)
  const revenue = bookings.reduce((sum, b) => sum + priceTotal(b), 0)
  const totals = costTotals(idx.costItemsByDeparture.get(departure.id) ?? [])
  const cost = pax > 0 ? profitAt({ ...totals, pricePerPax: 0, participants: pax }).hpp : 0
  return { departure, pax, revenue, cost, profit: revenue - cost }
}

export interface DepartureRealized {
  /** Travelers on completed bookings. */
  pax: number
  /** Completed booking totals plus cancellation money the company keeps. */
  revenue: IDR
  retained: IDR
  actualCost: IDR
  costLines: number
  filledLines: number
  /** Null until the figure can be computed; see `pendingReason`. */
  profit: IDR | null
  margin: number | null
  pendingReason: string | null
}

/**
 * Realised gross profit (§6.10). Only computed for a finished trip whose bookings are closed
 * and whose every cost line has an actual amount; otherwise it says why not.
 */
export function departureRealized(db: DemoDatabase, departure: Departure, today: DateOnly): DepartureRealized {
  const idx = getIndexes(db)
  const bookings = idx.bookingsByDeparture.get(departure.id) ?? []
  const completed = bookings.filter((b) => b.status === "completed")
  let retained = 0
  for (const booking of bookings) {
    if (booking.status !== "cancelled") continue
    const fin = bookingFinancials({ booking, invoice: idx.invoiceByBooking.get(booking.id), payments: idx.paymentsByBooking.get(booking.id) ?? [], today })
    retained += Math.max(0, fin.paidIn - fin.refundDue)
  }
  const lines = idx.costItemsByDeparture.get(departure.id) ?? []
  const actual = realizedCost(lines)
  const revenue = completed.reduce((sum, b) => sum + priceTotal(b), 0) + retained
  const open = bookings.filter((b) => b.status === "confirmed").length

  let pendingReason: string | null = null
  if (departure.cancelledAt) pendingReason = "Keberangkatan dibatalkan"
  else if (today <= departure.endDate) pendingReason = "Trip belum selesai"
  else if (open > 0) pendingReason = `${open} booking belum ditandai selesai`
  else if (lines.length === 0) pendingReason = "Belum ada komponen biaya"
  else if (!actual.complete) pendingReason = `Biaya aktual baru ${lines.filter((l) => l.actualAmount !== undefined).length} dari ${lines.length} komponen`

  const profit = pendingReason ? null : revenue - actual.total
  return {
    pax: completed.reduce((sum, b) => sum + idx.paxOf(b.id), 0),
    revenue,
    retained,
    actualCost: actual.total,
    costLines: lines.length,
    filledLines: lines.filter((l) => l.actualAmount !== undefined).length,
    profit,
    margin: profit !== null && revenue > 0 ? profit / revenue : null,
    pendingReason,
  }
}

export interface OverviewKpis {
  bookings: Comparison
  bookingValue: Comparison & { pipeline: IDR }
  inquiries: Comparison & { won: number; lost: number; conversionRate: number | null }
  upcoming: { departures: number; pax: number }
  outstanding: { amount: IDR; overdue: IDR; bookings: number }
  profitability: { profit: IDR; revenue: IDR; margin: number | null; departures: number }
}

export const UPCOMING_WINDOW_DAYS = 30
export const PROFIT_WINDOW_DAYS = 60

export function overviewKpis(db: DemoDatabase, now: Timestamp, days: number): OverviewKpis {
  const today = toDateOnlyWIB(now)
  const { current, previous } = periodRanges(today, days)
  const idx = getIndexes(db)
  const bookings = Object.values(db.bookings)
  const inquiries = Object.values(db.inquiries)

  const created = (range: PeriodRange) => bookings.filter((b) => inRange(b.createdAt, range))
  const active = (list: Booking[]) => list.filter((b) => b.status !== "cancelled")
  const secured = (list: Booking[]) => list.filter((b) => b.status === "confirmed" || b.status === "completed")
  const value = (list: Booking[]) => list.reduce((sum, b) => sum + priceTotal(b), 0)

  const inquiriesIn = (range: PeriodRange) => inquiries.filter((i) => inRange(i.createdAt, range))
  const currentInquiries = inquiriesIn(current)
  const won = currentInquiries.filter((i) => i.stage === "won").length
  const lost = currentInquiries.filter((i) => i.stage === "lost").length

  const upcomingEnd = addDays(today, UPCOMING_WINDOW_DAYS)
  const departures = Object.values(db.departures).filter((d) => !d.cancelledAt)
  const upcoming = departures.filter((d) => d.startDate >= today && d.startDate <= upcomingEnd)
  const upcomingPax = upcoming.reduce(
    (sum, d) => sum + seatSummary(d, idx.bookingsByDeparture.get(d.id) ?? [], idx.paxOf, now).allocated,
    0,
  )

  let outstanding = 0
  let overdue = 0
  let owing = 0
  for (const booking of bookings) {
    if (booking.status !== "awaiting_payment" && booking.status !== "confirmed") continue
    const fin = bookingFinancials({ booking, invoice: idx.invoiceByBooking.get(booking.id), payments: idx.paymentsByBooking.get(booking.id) ?? [], today })
    if (fin.outstanding > 0) owing++
    outstanding += fin.outstanding
    overdue += fin.overdueAmount
  }

  const profitEnd = addDays(today, PROFIT_WINDOW_DAYS)
  const estimates = departures.filter((d) => d.startDate >= today && d.startDate <= profitEnd).map((d) => departureEstimate(db, d)).filter((e) => e.pax > 0)
  const revenue = estimates.reduce((sum, e) => sum + e.revenue, 0)
  const profit = estimates.reduce((sum, e) => sum + e.profit, 0)

  return {
    bookings: compare(active(created(current)).length, active(created(previous)).length),
    bookingValue: {
      ...compare(value(secured(created(current))), value(secured(created(previous)))),
      pipeline: value(bookings.filter((b) => b.status === "pending" || b.status === "awaiting_payment")),
    },
    inquiries: { ...compare(currentInquiries.length, inquiriesIn(previous).length), won, lost, conversionRate: won + lost > 0 ? won / (won + lost) : null },
    upcoming: { departures: upcoming.length, pax: upcomingPax },
    outstanding: { amount: outstanding, overdue, bookings: owing },
    profitability: { profit, revenue, margin: revenue > 0 ? profit / revenue : null, departures: estimates.length },
  }
}

export interface TrendPoint {
  /** Monday of the week. */
  weekStart: DateOnly
  bookings: number
  value: IDR
}

/** Bookings created per week (Monday start), and the value of those that are secured. */
export function bookingTrend(db: DemoDatabase, now: Timestamp, weeks: number): TrendPoint[] {
  const today = toDateOnlyWIB(now)
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7
  const firstMonday = addDays(today, -weekday - (weeks - 1) * 7)
  const points: TrendPoint[] = Array.from({ length: weeks }, (_, i) => ({ weekStart: addDays(firstMonday, i * 7), bookings: 0, value: 0 }))
  for (const booking of Object.values(db.bookings)) {
    if (booking.status === "cancelled") continue
    const index = Math.floor(diffDays(toDateOnlyWIB(booking.createdAt), firstMonday) / 7)
    if (index < 0 || index >= weeks) continue
    points[index].bookings += 1
    if (booking.status === "confirmed" || booking.status === "completed") points[index].value += priceTotal(booking)
  }
  return points
}

export interface PopularPackage {
  pkg: TourPackage
  pax: number
  bookings: number
  revenue: IDR
}

export function popularPackages(db: DemoDatabase, now: Timestamp, days: number, limit: number): PopularPackage[] {
  const idx = getIndexes(db)
  const range = periodRanges(toDateOnlyWIB(now), days).current
  const byPackage = new Map<ID, PopularPackage>()
  for (const booking of Object.values(db.bookings)) {
    if (booking.status === "cancelled" || !inRange(booking.createdAt, range)) continue
    const pkg = db.packages[booking.packageId]
    if (!pkg) continue
    const row = byPackage.get(pkg.id) ?? { pkg, pax: 0, bookings: 0, revenue: 0 }
    row.pax += idx.paxOf(booking.id)
    row.bookings += 1
    if (booking.status === "confirmed" || booking.status === "completed") row.revenue += priceTotal(booking)
    byPackage.set(pkg.id, row)
  }
  return [...byPackage.values()].sort((a, b) => b.pax - a.pax || b.revenue - a.revenue).slice(0, limit)
}

export interface FollowUpItem {
  inquiry: Inquiry
  /** Days past the planned follow-up (0 = today); null for untouched new leads. */
  overdueDays: number | null
}

/** Leads whose follow-up date has come, plus new leads nobody has contacted for a day. */
export function followUpsDue(db: DemoDatabase, now: Timestamp): FollowUpItem[] {
  const today = toDateOnlyWIB(now)
  const items: FollowUpItem[] = []
  for (const inquiry of Object.values(db.inquiries)) {
    if (inquiry.stage === "won" || inquiry.stage === "lost" || inquiry.convertedBookingId) continue
    if (inquiry.nextFollowUpDate && inquiry.nextFollowUpDate <= today) {
      items.push({ inquiry, overdueDays: diffDays(today, inquiry.nextFollowUpDate) })
    } else if (inquiry.stage === "new" && Date.parse(now) - Date.parse(inquiry.createdAt) > 86_400_000) {
      items.push({ inquiry, overdueDays: null })
    }
  }
  return items.sort((a, b) => (b.overdueDays ?? 0.5) - (a.overdueDays ?? 0.5) || a.inquiry.createdAt.localeCompare(b.inquiry.createdAt))
}

export interface UpcomingDepartureRow {
  departure: Departure
  pkg: TourPackage
  seats: ReturnType<typeof seatSummary>
  readiness: TripReadiness
}

export function upcomingDepartureRows(db: DemoDatabase, now: Timestamp, windowDays: number): UpcomingDepartureRow[] {
  const idx = getIndexes(db)
  const today = toDateOnlyWIB(now)
  const end = addDays(today, windowDays)
  return Object.values(db.departures)
    .filter((d) => !d.cancelledAt && d.endDate >= today && d.startDate <= end)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((departure) => {
      const seats = seatSummary(departure, idx.bookingsByDeparture.get(departure.id) ?? [], idx.paxOf, now)
      return {
        departure,
        pkg: db.packages[departure.packageId],
        seats,
        readiness: tripReadiness({ departure, checklist: idx.checklistByDeparture.get(departure.id), guaranteed: seats.guaranteed, today }),
      }
    })
}

export interface PaymentDueItem {
  booking: Booking
  installment: Installment
  remaining: IDR
  overdue: boolean
}

/** Next unpaid installment due within `days` days, or already late. */
export function paymentsDue(db: DemoDatabase, now: Timestamp, days: number): PaymentDueItem[] {
  const idx = getIndexes(db)
  const today = toDateOnlyWIB(now)
  const limit = addDays(today, days)
  const items: PaymentDueItem[] = []
  for (const booking of Object.values(db.bookings)) {
    if (booking.status !== "awaiting_payment" && booking.status !== "confirmed") continue
    const fin = bookingFinancials({ booking, invoice: idx.invoiceByBooking.get(booking.id), payments: idx.paymentsByBooking.get(booking.id) ?? [], today })
    const next = fin.nextInstallment
    if (!next || next.installment.dueDate > limit) continue
    items.push({ booking, installment: next.installment, remaining: next.remaining, overdue: next.installment.dueDate < today })
  }
  return items.sort((a, b) => a.installment.dueDate.localeCompare(b.installment.dueDate))
}

export interface IncompleteTravelersItem {
  booking: Booking
  departure: Departure
  missing: number
  pax: number
}

/** Bookings travelling within `days` days that still miss traveler data for the manifest. */
export function incompleteTravelers(db: DemoDatabase, now: Timestamp, days: number): IncompleteTravelersItem[] {
  const idx = getIndexes(db)
  const today = toDateOnlyWIB(now)
  const end = addDays(today, days)
  const items: IncompleteTravelersItem[] = []
  for (const booking of Object.values(db.bookings)) {
    if (booking.status === "cancelled" || booking.status === "completed") continue
    const departure = db.departures[booking.departureId]
    if (!departure || departure.cancelledAt || departure.startDate < today || departure.startDate > end) continue
    const links = idx.bookingTravelersByBooking.get(booking.id) ?? []
    const missing = links.filter((bt) => {
      const traveler = db.travelers[bt.travelerId]
      return !traveler || !isTravelerComplete(traveler)
    }).length
    if (missing > 0) items.push({ booking, departure, missing, pax: links.length })
  }
  return items.sort((a, b) => a.departure.startDate.localeCompare(b.departure.startDate))
}
