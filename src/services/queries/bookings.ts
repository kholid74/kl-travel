import type { DateOnly } from "@/lib/dates"
import type { DemoDatabase } from "@/domain/database"
import type { Booking, Customer, Departure, TourPackage } from "@/domain/entities"
import { getIndexes } from "@/domain/indexes"
import { bookingFinancials, type BookingFinancials } from "@/domain/rules/payment-status"

export interface BookingRow {
  booking: Booking
  customer?: Customer
  pkg?: TourPackage
  departure?: Departure
  pax: number
  fin: BookingFinancials
}

/** Booking joined with what the list shows; financials are always derived (ADR-0002). */
export function bookingRows(db: DemoDatabase, today: DateOnly): BookingRow[] {
  const idx = getIndexes(db)
  return Object.values(db.bookings).map((booking) => ({
    booking,
    customer: db.customers[booking.customerId],
    pkg: db.packages[booking.packageId],
    departure: db.departures[booking.departureId],
    pax: idx.paxOf(booking.id),
    fin: bookingFinancials({
      booking,
      invoice: idx.invoiceByBooking.get(booking.id),
      payments: idx.paymentsByBooking.get(booking.id) ?? [],
      today,
    }),
  }))
}

/** "Belum lunas": invoiced, still active, money still owed. */
export function isUnsettled(row: Pick<BookingRow, "booking" | "fin">): boolean {
  return (row.booking.status === "awaiting_payment" || row.booking.status === "confirmed") && row.fin.outstanding > 0
}

export function matchesSearch(row: BookingRow, term: string): boolean {
  if (!term) return true
  const haystack = [row.booking.code, row.customer?.fullName, row.customer?.phone, row.customer?.email, row.pkg?.title, row.departure?.code]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return haystack.includes(term.toLowerCase())
}
