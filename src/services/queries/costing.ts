import type { DateOnly } from "@/lib/dates"
import type { DemoDatabase } from "@/domain/database"
import type { CostItem, CostOwner, Departure, TourPackage } from "@/domain/entities"
import { getIndexes } from "@/domain/indexes"
import { departureEstimate, departureRealized, type DepartureEstimate, type DepartureRealized } from "@/domain/rules/metrics"
import { pricePerPax, priceTotal } from "@/domain/rules/pricing"
import type { IDR } from "@/domain/types/common"

export interface CostingSource {
  owner: CostOwner
  title: string
  subtitle: string
  pkg: TourPackage
  departure?: Departure
  items: CostItem[]
  /** Participants the simulation starts from. */
  defaultParticipants: number
  maxParticipants: number
  /** Selling price per participant the simulation starts from; null for quoted packages. */
  defaultPrice: IDR | null
  /** Price for a given group size when the package uses tiers. */
  priceFor: (participants: number) => IDR | null
}

/** A departure's own cost lines, or a package template when no departure is chosen. */
export function costingSource(db: DemoDatabase, selection: { departureId?: string; packageId?: string }): CostingSource | null {
  const idx = getIndexes(db)
  if (selection.departureId) {
    const departure = db.departures[selection.departureId]
    const pkg = departure && db.packages[departure.packageId]
    if (!departure || !pkg) return null
    const estimate = departureEstimate(db, departure)
    // A private departure is priced by its quotation: use the booked price per participant.
    const booked = (idx.bookingsByDeparture.get(departure.id) ?? []).find((b) => b.status !== "cancelled")
    const bookedPrice = departure.kind === "private" && booked ? Math.round(priceTotal(booked) / Math.max(1, idx.paxOf(booked.id))) : null
    const priceFor = (n: number) => bookedPrice ?? pricePerPax(pkg, n, departure)
    const defaultParticipants = estimate.pax > 0 ? estimate.pax : departure.capacity
    return {
      owner: { type: "departure", departureId: departure.id },
      title: pkg.title,
      subtitle: `Keberangkatan ${departure.code}`,
      pkg,
      departure,
      items: idx.costItemsByDeparture.get(departure.id) ?? [],
      defaultParticipants,
      maxParticipants: Math.max(departure.capacity, defaultParticipants),
      defaultPrice: priceFor(defaultParticipants),
      priceFor,
    }
  }
  const pkg = selection.packageId ? db.packages[selection.packageId] : undefined
  if (!pkg) return null
  const priceFor = (n: number) => pricePerPax(pkg, n)
  const defaultParticipants = Math.max(pkg.groupSize.min, Math.min(pkg.groupSize.max, Math.round((pkg.groupSize.min + pkg.groupSize.max) / 2)))
  return {
    owner: { type: "package", packageId: pkg.id },
    title: pkg.title,
    subtitle: "Template biaya paket",
    pkg,
    items: idx.costItemsByPackage.get(pkg.id) ?? [],
    defaultParticipants,
    maxParticipants: Math.max(pkg.groupSize.max, defaultParticipants),
    defaultPrice: priceFor(defaultParticipants),
    priceFor,
  }
}

export interface DepartureProfitRow {
  departure: Departure
  pkg?: TourPackage
  estimate: DepartureEstimate
  realized: DepartureRealized
  phase: "upcoming" | "running" | "finished"
}

export function departureProfitRows(db: DemoDatabase, today: DateOnly): DepartureProfitRow[] {
  return Object.values(db.departures)
    .filter((d) => !d.cancelledAt)
    .map((departure) => ({
      departure,
      pkg: db.packages[departure.packageId],
      estimate: departureEstimate(db, departure),
      realized: departureRealized(db, departure, today),
      phase: today > departure.endDate ? ("finished" as const) : today >= departure.startDate ? ("running" as const) : ("upcoming" as const),
    }))
}
