import type { DateOnly } from "@/lib/dates"
import type { DemoDatabase } from "@/domain/database"
import type { Booking, Customer, Departure, Invoice, Payment, TourPackage } from "@/domain/entities"
import { getIndexes } from "@/domain/indexes"
import { bookingFinancials, installmentCoverage, type BookingFinancials, type InstallmentCoverage } from "@/domain/rules/payment-status"

export type InvoiceDisplayStatus = "void" | BookingFinancials["status"]

export interface InvoiceView {
  invoice: Invoice
  booking: Booking
  customer?: Customer
  pkg?: TourPackage
  departure?: Departure
  payments: Payment[]
  fin: BookingFinancials
  coverage: InstallmentCoverage[]
  /** First installment with money still owed. */
  nextDue?: InstallmentCoverage
  status: InvoiceDisplayStatus
}

function viewOf(db: DemoDatabase, invoice: Invoice, today: DateOnly): InvoiceView | null {
  const booking = db.bookings[invoice.bookingId]
  if (!booking) return null
  const payments = getIndexes(db).paymentsByBooking.get(booking.id) ?? []
  const fin = bookingFinancials({ booking, invoice, payments, today })
  const coverage = invoice.voidedAt ? [] : installmentCoverage(invoice.installments, fin.paidNet, today)
  return {
    invoice,
    booking,
    customer: db.customers[booking.customerId],
    pkg: db.packages[booking.packageId],
    departure: db.departures[booking.departureId],
    payments: [...payments].sort((a, b) => a.paidAt.localeCompare(b.paidAt)),
    fin,
    coverage,
    nextDue: coverage.find((c) => c.remaining > 0),
    status: invoice.voidedAt ? "void" : fin.status,
  }
}

export function invoiceRows(db: DemoDatabase, today: DateOnly): InvoiceView[] {
  return Object.values(db.invoices)
    .map((invoice) => viewOf(db, invoice, today))
    .filter((row): row is InvoiceView => row !== null)
}

export function invoiceView(db: DemoDatabase, invoiceId: string, today: DateOnly): InvoiceView | null {
  const invoice = db.invoices[invoiceId]
  return invoice ? viewOf(db, invoice, today) : null
}
