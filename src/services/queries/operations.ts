import type { DateOnly, Timestamp } from "@/lib/dates"
import type { DemoDatabase } from "@/domain/database"
import type { Booking, Departure, Guide, TourPackage, Traveler, TripChecklist, VendorAssignment } from "@/domain/entities"
import { getIndexes } from "@/domain/indexes"
import { seatSummary, type SeatSummary } from "@/domain/rules/availability"
import { missingTravelerFields } from "@/domain/rules/travelers"
import { checklistContext, tripReadiness, type ChecklistContext, type TripReadiness } from "@/domain/rules/trip-readiness"

export interface ManifestRow {
  booking: Booking
  traveler: Traveler
  isLead: boolean
  missing: string[]
}

/** Travelers on confirmed and completed bookings: the people who actually travel. */
export function manifestRows(db: DemoDatabase, departureId: string): ManifestRow[] {
  const idx = getIndexes(db)
  return (idx.bookingsByDeparture.get(departureId) ?? [])
    .filter((b) => b.status === "confirmed" || b.status === "completed")
    .sort((a, b) => a.code.localeCompare(b.code))
    .flatMap((booking) =>
      [...(idx.bookingTravelersByBooking.get(booking.id) ?? [])]
        .sort((a, b) => Number(b.isLead) - Number(a.isLead))
        .map((bt) => db.travelers[bt.travelerId] && { booking, traveler: db.travelers[bt.travelerId], isLead: bt.isLead, missing: missingTravelerFields(db.travelers[bt.travelerId]) })
        .filter((row): row is ManifestRow => !!row),
    )
}

export interface OperationsRow {
  departure: Departure
  pkg?: TourPackage
  guide?: Guide
  seats: SeatSummary
  checklist?: TripChecklist
  context: ChecklistContext
  readiness: TripReadiness
  vendors: VendorAssignment[]
}

export function operationsRow(db: DemoDatabase, departure: Departure, now: Timestamp, today: DateOnly): OperationsRow {
  const idx = getIndexes(db)
  const bookings = idx.bookingsByDeparture.get(departure.id) ?? []
  const checklist = idx.checklistByDeparture.get(departure.id)
  const seats = seatSummary(departure, bookings, idx.paxOf, now)
  const vendors = idx.vendorAssignmentsByDeparture.get(departure.id) ?? []
  return {
    departure,
    pkg: db.packages[departure.packageId],
    guide: departure.guideId ? db.guides[departure.guideId] : undefined,
    seats,
    checklist,
    context: checklistContext({
      departure,
      checklist,
      bookings,
      travelersOf: (bookingId) => (idx.bookingTravelersByBooking.get(bookingId) ?? []).map((bt) => db.travelers[bt.travelerId]).filter(Boolean),
      assignments: vendors,
      now,
    }),
    readiness: tripReadiness({ departure, checklist, guaranteed: seats.guaranteed, today }),
    vendors,
  }
}

/** Trips still to run or running now, soonest first. */
export function operationsBoard(db: DemoDatabase, now: Timestamp, today: DateOnly): OperationsRow[] {
  return Object.values(db.departures)
    .filter((d) => !d.cancelledAt && d.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((departure) => operationsRow(db, departure, now, today))
}
