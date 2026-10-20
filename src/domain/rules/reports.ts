/**
 * Reports module (requirement §6.10). Pure functions over one snapshot and a date range;
 * every chart and table on /dashboard/reports comes from here.
 */
import { addDays, diffDays, toDateOnlyWIB, type DateOnly, type Timestamp } from "@/lib/dates"
import type { DemoDatabase } from "../database"
import type { Booking, Departure, Destination, Installment, PipelineStage, TourPackage } from "../entities"
import { getIndexes } from "../indexes"
import type { ID, IDR, Source } from "../types/common"
import { seatSummary } from "./availability"
import { departureEstimate, departureRealized, type DepartureEstimate, type DepartureRealized, type PeriodRange } from "./metrics"
import { bookingFinancials, installmentCoverage } from "./payment-status"
import { priceTotal } from "./pricing"

export type ReportRangeKey = "30d" | "90d" | "ytd" | "custom"

/** Resolves the period filter; an invalid custom range falls back to the last 30 days. */
export function reportRange(key: ReportRangeKey, today: DateOnly, custom?: { from?: string; to?: string }): PeriodRange & { key: ReportRangeKey } {
  const isDate = (value?: string): value is DateOnly => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value)
  if (key === "custom" && isDate(custom?.from) && isDate(custom?.to) && custom.from <= custom.to) {
    return { key, from: custom.from, to: custom.to }
  }
  if (key === "90d") return { key, from: addDays(today, -89), to: today }
  if (key === "ytd") return { key, from: `${today.slice(0, 4)}-01-01`, to: today }
  return { key: "30d", from: addDays(today, -29), to: today }
}

const createdIn = (at: Timestamp, range: PeriodRange) => {
  const date = toDateOnlyWIB(at)
  return date >= range.from && date <= range.to
}
const secured = (b: Booking) => b.status === "confirmed" || b.status === "completed"

export interface TrendBucket {
  start: DateOnly
  end: DateOnly
  bookings: number
  cancelled: number
  /** Value of bookings that are confirmed or completed. */
  value: IDR
}

/** Weekly buckets (Monday start) for ranges up to 13 weeks, monthly beyond that. */
export function bookingTrendReport(db: DemoDatabase, range: PeriodRange): { unit: "week" | "month"; buckets: TrendBucket[] } {
  const unit = diffDays(range.to, range.from) <= 91 ? "week" : "month"
  const buckets: TrendBucket[] = []
  let start: DateOnly = unit === "week" ? addDays(range.from, -((new Date(`${range.from}T00:00:00Z`).getUTCDay() + 6) % 7)) : `${range.from.slice(0, 7)}-01`
  while (start <= range.to) {
    const next: DateOnly = unit === "week" ? addDays(start, 7) : `${addDays(start, 32).slice(0, 7)}-01`
    buckets.push({ start, end: addDays(next, -1), bookings: 0, cancelled: 0, value: 0 })
    start = next
  }
  for (const booking of Object.values(db.bookings)) {
    if (!createdIn(booking.createdAt, range)) continue
    const date = toDateOnlyWIB(booking.createdAt)
    const bucket = buckets.find((b) => date >= b.start && date <= b.end)
    if (!bucket) continue
    if (booking.status === "cancelled") bucket.cancelled += 1
    else bucket.bookings += 1
    if (secured(booking)) bucket.value += priceTotal(booking)
  }
  return { unit, buckets }
}

export interface PackageSales {
  pkg: TourPackage
  bookings: number
  pax: number
  /** Confirmed or completed value. */
  value: IDR
  /** Pending and awaiting-payment value. */
  pipeline: IDR
}

export function salesByPackage(db: DemoDatabase, range: PeriodRange): PackageSales[] {
  const idx = getIndexes(db)
  const rows = new Map<ID, PackageSales>()
  for (const booking of Object.values(db.bookings)) {
    if (booking.status === "cancelled" || !createdIn(booking.createdAt, range)) continue
    const pkg = db.packages[booking.packageId]
    if (!pkg) continue
    const row = rows.get(pkg.id) ?? { pkg, bookings: 0, pax: 0, value: 0, pipeline: 0 }
    row.bookings += 1
    row.pax += idx.paxOf(booking.id)
    if (secured(booking)) row.value += priceTotal(booking)
    else row.pipeline += priceTotal(booking)
    rows.set(pkg.id, row)
  }
  return [...rows.values()].sort((a, b) => b.value - a.value || b.pipeline - a.pipeline || b.pax - a.pax)
}

export interface DestinationDemand {
  destination: Destination
  /** Travelers on non-cancelled bookings created in the period. */
  pax: number
  bookings: number
  /** Inquiries created in the period that mention the destination. */
  inquiries: number
}

export function popularDestinations(db: DemoDatabase, range: PeriodRange): DestinationDemand[] {
  const idx = getIndexes(db)
  const rows = new Map<ID, DestinationDemand>()
  const row = (id: ID) => {
    const destination = db.destinations[id]
    if (!destination) return null
    const existing = rows.get(id) ?? { destination, pax: 0, bookings: 0, inquiries: 0 }
    rows.set(id, existing)
    return existing
  }
  for (const booking of Object.values(db.bookings)) {
    if (booking.status === "cancelled" || !createdIn(booking.createdAt, range)) continue
    const target = row(db.packages[booking.packageId]?.destinationId ?? "")
    if (!target) continue
    target.bookings += 1
    target.pax += idx.paxOf(booking.id)
  }
  for (const inquiry of Object.values(db.inquiries)) {
    if (!createdIn(inquiry.createdAt, range)) continue
    const ids = new Set(inquiry.destinationIds)
    const viaPackage = inquiry.packageId ? db.packages[inquiry.packageId]?.destinationId : undefined
    if (viaPackage) ids.add(viaPackage)
    for (const id of ids) {
      const target = row(id)
      if (target) target.inquiries += 1
    }
  }
  return [...rows.values()].sort((a, b) => b.pax - a.pax || b.inquiries - a.inquiries)
}

export interface LeadConversion {
  total: number
  funnel: { key: "received" | "contacted" | "quoted" | "won"; label: string; count: number }[]
  won: number
  lost: number
  open: number
  /** won / (won + lost); null when nothing is decided yet. */
  winRate: number | null
  bySource: { source: Source; total: number; won: number; lost: number; winRate: number | null }[]
  byStage: Record<PipelineStage, number>
}

/**
 * Inquiries created in the period. A lead counts as contacted once it left "Baru", and as
 * quoted once a quotation was sent or it reached that stage.
 */
export function leadConversion(db: DemoDatabase, range: PeriodRange): LeadConversion {
  const idx = getIndexes(db)
  const inquiries = Object.values(db.inquiries).filter((i) => createdIn(i.createdAt, range))
  const byStage: Record<PipelineStage, number> = { new: 0, contacted: 0, quotation_sent: 0, negotiation: 0, won: 0, lost: 0 }
  const sources = new Map<Source, { total: number; won: number; lost: number }>()
  let contacted = 0
  let quoted = 0
  for (const inquiry of inquiries) {
    byStage[inquiry.stage] += 1
    if (inquiry.stage !== "new") contacted += 1
    const sent = (idx.quotationsByInquiry.get(inquiry.id) ?? []).some((q) => q.sentAt)
    if (sent || inquiry.stage === "quotation_sent" || inquiry.stage === "negotiation" || inquiry.stage === "won") quoted += 1
    const source = sources.get(inquiry.source) ?? { total: 0, won: 0, lost: 0 }
    source.total += 1
    if (inquiry.stage === "won") source.won += 1
    if (inquiry.stage === "lost") source.lost += 1
    sources.set(inquiry.source, source)
  }
  const rate = (won: number, lost: number) => (won + lost > 0 ? won / (won + lost) : null)
  return {
    total: inquiries.length,
    funnel: [
      { key: "received", label: "Inquiry masuk", count: inquiries.length },
      { key: "contacted", label: "Sudah dihubungi", count: contacted },
      { key: "quoted", label: "Menerima penawaran", count: quoted },
      { key: "won", label: "Berhasil", count: byStage.won },
    ],
    won: byStage.won,
    lost: byStage.lost,
    open: inquiries.length - byStage.won - byStage.lost,
    winRate: rate(byStage.won, byStage.lost),
    bySource: [...sources.entries()]
      .map(([source, s]) => ({ source, ...s, winRate: rate(s.won, s.lost) }))
      .sort((a, b) => b.total - a.total),
    byStage,
  }
}

export interface OccupancyRow {
  departure: Departure
  pkg?: TourPackage
  allocated: number
  capacity: number
  occupancy: number
  guaranteed: boolean
}

/** Scheduled departures starting in the period (private ones are always full by design). */
export function departureOccupancy(db: DemoDatabase, range: PeriodRange, now: Timestamp): { rows: OccupancyRow[]; average: number | null } {
  const idx = getIndexes(db)
  const rows = Object.values(db.departures)
    .filter((d) => d.kind === "scheduled" && !d.cancelledAt && d.startDate >= range.from && d.startDate <= range.to)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((departure) => {
      const seats = seatSummary(departure, idx.bookingsByDeparture.get(departure.id) ?? [], idx.paxOf, now)
      return {
        departure,
        pkg: db.packages[departure.packageId],
        allocated: seats.allocated,
        capacity: departure.capacity,
        occupancy: departure.capacity > 0 ? seats.allocated / departure.capacity : 0,
        guaranteed: seats.guaranteed,
      }
    })
  const capacity = rows.reduce((sum, r) => sum + r.capacity, 0)
  return { rows, average: capacity > 0 ? rows.reduce((sum, r) => sum + r.allocated, 0) / capacity : null }
}

export type AgingBucket = "not_due" | "1_7" | "8_30" | "over_30"

export const AGING_LABEL: Record<AgingBucket, string> = {
  not_due: "Belum jatuh tempo",
  "1_7": "Lewat 1–7 hari",
  "8_30": "Lewat 8–30 hari",
  over_30: "Lewat > 30 hari",
}

export interface AgingItem {
  booking: Booking
  installment: Installment
  remaining: IDR
  daysLate: number
  bucket: AgingBucket
}

/** Unpaid part of every installment as of today (position, not period based). */
export function outstandingAging(db: DemoDatabase, today: DateOnly): { items: AgingItem[]; totals: Record<AgingBucket, IDR> } {
  const idx = getIndexes(db)
  const items: AgingItem[] = []
  const totals: Record<AgingBucket, IDR> = { not_due: 0, "1_7": 0, "8_30": 0, over_30: 0 }
  for (const booking of Object.values(db.bookings)) {
    if (booking.status !== "awaiting_payment" && booking.status !== "confirmed") continue
    const invoice = idx.invoiceByBooking.get(booking.id)
    if (!invoice) continue
    const fin = bookingFinancials({ booking, invoice, payments: idx.paymentsByBooking.get(booking.id) ?? [], today })
    for (const { installment, remaining } of installmentCoverage(invoice.installments, fin.paidNet, today)) {
      if (remaining === 0) continue
      const daysLate = Math.max(0, diffDays(today, installment.dueDate))
      const bucket: AgingBucket = daysLate === 0 ? "not_due" : daysLate <= 7 ? "1_7" : daysLate <= 30 ? "8_30" : "over_30"
      totals[bucket] += remaining
      items.push({ booking, installment, remaining, daysLate, bucket })
    }
  }
  return { items: items.sort((a, b) => b.daysLate - a.daysLate || a.installment.dueDate.localeCompare(b.installment.dueDate)), totals }
}

export interface ProfitabilityRow {
  estimate: DepartureEstimate
  realized: DepartureRealized
  pkg?: TourPackage
}

/** Departures starting in the period with at least one confirmed traveler. */
export function profitabilityReport(db: DemoDatabase, range: PeriodRange, today: DateOnly) {
  const rows: ProfitabilityRow[] = Object.values(db.departures)
    .filter((d) => !d.cancelledAt && d.startDate >= range.from && d.startDate <= range.to)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((departure) => ({ estimate: departureEstimate(db, departure), realized: departureRealized(db, departure, today), pkg: db.packages[departure.packageId] }))
    .filter((row) => row.estimate.pax > 0)
  const estimatedRevenue = rows.reduce((sum, r) => sum + r.estimate.revenue, 0)
  const estimatedProfit = rows.reduce((sum, r) => sum + r.estimate.profit, 0)
  const realized = rows.filter((r) => r.realized.profit !== null)
  const realizedRevenue = realized.reduce((sum, r) => sum + r.realized.revenue, 0)
  const realizedProfit = realized.reduce((sum, r) => sum + (r.realized.profit ?? 0), 0)
  return {
    rows,
    estimated: { revenue: estimatedRevenue, profit: estimatedProfit, margin: estimatedRevenue > 0 ? estimatedProfit / estimatedRevenue : null },
    realized: { departures: realized.length, revenue: realizedRevenue, profit: realizedProfit, margin: realizedRevenue > 0 ? realizedProfit / realizedRevenue : null },
  }
}
