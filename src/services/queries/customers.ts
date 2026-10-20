import type { DemoDatabase } from "@/domain/database"
import type { Customer } from "@/domain/entities"
import { getIndexes } from "@/domain/indexes"
import { customerStage, type CustomerStage } from "@/domain/rules/customer-identity"
import { priceTotal } from "@/domain/rules/pricing"
import type { IDR } from "@/domain/types/common"

export interface CustomerRow {
  customer: Customer
  stage: CustomerStage
  bookings: number
  inquiries: number
  /** Total of confirmed and completed bookings. */
  value: IDR
  lastActivity: string
}

export function customerRows(db: DemoDatabase): CustomerRow[] {
  const idx = getIndexes(db)
  return Object.values(db.customers).map((customer) => {
    const bookings = idx.bookingsByCustomer.get(customer.id) ?? []
    const inquiries = idx.inquiriesByCustomer.get(customer.id) ?? []
    const dates = [customer.createdAt, ...bookings.map((b) => b.createdAt), ...inquiries.map((i) => i.createdAt)]
    return {
      customer,
      stage: customerStage(bookings),
      bookings: bookings.filter((b) => b.status !== "cancelled").length,
      inquiries: inquiries.length,
      value: bookings.filter((b) => b.status === "confirmed" || b.status === "completed").reduce((sum, b) => sum + priceTotal(b), 0),
      lastActivity: dates.sort().at(-1)!,
    }
  })
}

export function matchesCustomerSearch(row: CustomerRow, term: string): boolean {
  if (!term) return true
  const digits = term.replace(/\D/g, "")
  const { customer } = row
  const text = [customer.fullName, customer.code, customer.email, customer.city].filter(Boolean).join(" ").toLowerCase()
  return text.includes(term.toLowerCase()) || (digits.length >= 4 && customer.phone.replace(/\D/g, "").includes(digits.replace(/^0/, "")))
}
