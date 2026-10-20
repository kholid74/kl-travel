import type { DateOnly, Timestamp } from "@/lib/dates"
import type { DemoDatabase } from "@/domain/database"
import type { Departure, Guide, TourPackage } from "@/domain/entities"
import { getIndexes } from "@/domain/indexes"
import { departureDisplayStatus, seatSummary, type DepartureDisplayStatus, type SeatSummary } from "@/domain/rules/availability"

export interface DepartureRow {
  departure: Departure
  pkg?: TourPackage
  guide?: Guide
  seats: SeatSummary
  status: DepartureDisplayStatus
  bookings: number
}

export function departureRows(db: DemoDatabase, now: Timestamp, today: DateOnly): DepartureRow[] {
  const idx = getIndexes(db)
  return Object.values(db.departures).map((departure) => {
    const pkg = db.packages[departure.packageId]
    const list = idx.bookingsByDeparture.get(departure.id) ?? []
    const seats = seatSummary(departure, list, idx.paxOf, now)
    return {
      departure,
      pkg,
      guide: departure.guideId ? db.guides[departure.guideId] : undefined,
      seats,
      status: departureDisplayStatus({ departure, seats, today, settings: db.settings.booking, packageArchived: pkg?.status === "archived" }),
      bookings: list.filter((b) => b.status !== "cancelled").length,
    }
  })
}
