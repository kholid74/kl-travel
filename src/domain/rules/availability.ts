import { diffDays, type DateOnly, type Timestamp } from "@/lib/dates"
import type { Booking, Departure, Settings } from "../entities"

export interface SeatSummary {
  capacity: number
  /** Seats taken by confirmed/completed bookings. */
  allocated: number
  /** Seats temporarily held by pending/awaiting-payment bookings with a live hold. */
  held: number
  available: number
  occupancy: number
  minParticipants: number
  guaranteed: boolean
}

export function isHoldActive(booking: Pick<Booking, "status" | "holdExpiresAt">, now: Timestamp): boolean {
  if (booking.status !== "pending" && booking.status !== "awaiting_payment") return false
  return !!booking.holdExpiresAt && Date.parse(booking.holdExpiresAt) > Date.parse(now)
}

export function seatSummary(
  departure: Pick<Departure, "capacity" | "minParticipants">,
  bookings: readonly Pick<Booking, "id" | "status" | "holdExpiresAt">[],
  paxOf: (bookingId: string) => number,
  now: Timestamp,
): SeatSummary {
  let allocated = 0
  let held = 0
  for (const booking of bookings) {
    if (booking.status === "confirmed" || booking.status === "completed") allocated += paxOf(booking.id)
    else if (isHoldActive(booking, now)) held += paxOf(booking.id)
  }
  const capacity = departure.capacity
  return {
    capacity,
    allocated,
    held,
    available: Math.max(0, capacity - allocated - held),
    occupancy: capacity > 0 ? allocated / capacity : 0,
    minParticipants: departure.minParticipants,
    guaranteed: allocated >= departure.minParticipants,
  }
}

/** Lowest capacity a departure can be edited down to. */
export function minimumCapacity(seats: Pick<SeatSummary, "allocated" | "held">): number {
  return Math.max(1, seats.allocated + seats.held)
}

export type DepartureDisplayStatus = "cancelled" | "completed" | "departed" | "full" | "closed" | "limited" | "open"

export function departureDisplayStatus(input: {
  departure: Pick<Departure, "startDate" | "endDate" | "cancelledAt" | "salesClosed">
  seats: Pick<SeatSummary, "available">
  today: DateOnly
  settings: Pick<Settings["booking"], "salesCutoffDays" | "lowSeatThreshold">
  packageArchived?: boolean
}): DepartureDisplayStatus {
  const { departure, seats, today, settings } = input
  if (departure.cancelledAt) return "cancelled"
  if (today > departure.endDate) return "completed"
  if (today >= departure.startDate) return "departed"
  if (seats.available === 0) return "full"
  if (departure.salesClosed || input.packageArchived || diffDays(departure.startDate, today) < settings.salesCutoffDays) {
    return "closed"
  }
  if (seats.available <= settings.lowSeatThreshold) return "limited"
  return "open"
}

export function isBookable(status: DepartureDisplayStatus): boolean {
  return status === "open" || status === "limited"
}
