import { normalizeEmail, normalizePhone } from "@/lib/phone"
import type { Booking, Customer } from "../entities"

/** Match by normalised phone first, then email (docs/domain-model.md §6.8). */
export function findCustomerMatch(
  customers: readonly Pick<Customer, "id" | "phone" | "email">[],
  input: { phone?: string; email?: string },
) {
  const phone = input.phone ? normalizePhone(input.phone) : null
  if (phone) {
    const byPhone = customers.find((customer) => customer.phone === phone)
    if (byPhone) return byPhone
  }
  const email = input.email ? normalizeEmail(input.email) : null
  if (email) return customers.find((customer) => customer.email === email)
  return undefined
}

export type CustomerStage = "prospect" | "customer" | "repeat"

export function customerStage(bookings: readonly Pick<Booking, "status">[]): CustomerStage {
  const completed = bookings.filter((booking) => booking.status === "completed").length
  if (completed >= 2) return "repeat"
  return bookings.some((booking) => booking.status !== "cancelled") ? "customer" : "prospect"
}
