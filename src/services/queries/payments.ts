import type { DateOnly } from "@/lib/dates"
import type { DemoDatabase } from "@/domain/database"
import type { Booking, Customer, Departure, Invoice, Payment, TourPackage } from "@/domain/entities"
import { getIndexes } from "@/domain/indexes"
import { bookingFinancials, type BookingFinancials } from "@/domain/rules/payment-status"

export interface PaymentRow {
  payment: Payment
  booking?: Booking
  customer?: Customer
  pkg?: TourPackage
  departure?: Departure
  invoice?: Invoice
  /** Financials of the booking as they stand now. */
  fin?: BookingFinancials
}

export function paymentRows(db: DemoDatabase, today: DateOnly): PaymentRow[] {
  const idx = getIndexes(db)
  const finCache = new Map<string, BookingFinancials>()
  return Object.values(db.payments).map((payment) => {
    const booking = db.bookings[payment.bookingId]
    let fin = finCache.get(payment.bookingId)
    if (booking && !fin) {
      fin = bookingFinancials({ booking, invoice: idx.invoiceByBooking.get(booking.id), payments: idx.paymentsByBooking.get(booking.id) ?? [], today })
      finCache.set(booking.id, fin)
    }
    return {
      payment,
      booking,
      customer: booking ? db.customers[booking.customerId] : undefined,
      pkg: booking ? db.packages[booking.packageId] : undefined,
      departure: booking ? db.departures[booking.departureId] : undefined,
      invoice: booking ? idx.invoiceByBooking.get(booking.id) : undefined,
      fin,
    }
  })
}

export function matchesPaymentSearch(row: PaymentRow, term: string): boolean {
  if (!term) return true
  const haystack = [row.payment.code, row.payment.reference, row.booking?.code, row.invoice?.number, row.customer?.fullName, row.customer?.phone]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return haystack.includes(term.toLowerCase())
}
