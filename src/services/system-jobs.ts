import { toDateOnlyWIB, type Timestamp } from "@/lib/dates"
import type { DemoDatabase } from "@/domain/database"
import { getIndexes } from "@/domain/indexes"
import { holdExpired } from "@/domain/rules/booking-lifecycle"
import { bookingFinancials } from "@/domain/rules/payment-status"
import type { ID } from "@/domain/types/common"
import type { DataSource } from "@/repositories"
import { logActivity, SYSTEM_ACTOR } from "./activity-log"

export interface SystemWork {
  expireHolds: ID[]
  completeBookings: ID[]
}

/** What the simulated scheduler would do right now (architecture.md §5.6). Pure. */
export function findSystemWork(db: DemoDatabase, now: Timestamp): SystemWork {
  const idx = getIndexes(db)
  const today = toDateOnlyWIB(now)
  const work: SystemWork = { expireHolds: [], completeBookings: [] }
  for (const booking of Object.values(db.bookings)) {
    if (holdExpired(booking, now)) {
      work.expireHolds.push(booking.id)
      continue
    }
    if (booking.status !== "confirmed") continue
    const departure = db.departures[booking.departureId]
    if (!departure || today <= departure.endDate) continue
    const fin = bookingFinancials({
      booking,
      invoice: idx.invoiceByBooking.get(booking.id),
      payments: idx.paymentsByBooking.get(booking.id) ?? [],
      today,
    })
    if (fin.status === "paid") work.completeBookings.push(booking.id)
  }
  return work
}

/** Applies pending system work in one transaction. Idempotent; no write when idle. */
export function runSystemJobs(dataSource: DataSource, now: Date = new Date()): SystemWork {
  const nowTs = now.toISOString()
  const work = findSystemWork(dataSource.current().db, nowTs)
  if (!work.expireHolds.length && !work.completeBookings.length) return work

  dataSource.transaction((uow) => {
    const fresh = findSystemWork(uow.snapshot(), nowTs)
    const idx = getIndexes(uow.snapshot())
    for (const id of fresh.expireHolds) {
      const booking = uow.bookings.require(id)
      const paidNet = (idx.paymentsByBooking.get(id) ?? [])
        .filter((p) => p.status === "verified")
        .reduce((sum, p) => sum + (p.direction === "in" ? p.amount : -p.amount), 0)
      uow.bookings.update(id, {
        status: "cancelled",
        holdExpiresAt: undefined,
        updatedAt: nowTs,
        cancellation: { at: nowTs, by: SYSTEM_ACTOR, reason: "hold_expired", feeAmount: 0, refundAmount: paidNet },
      })
      const invoice = idx.invoiceByBooking.get(id)
      if (invoice) uow.invoices.update(invoice.id, { voidedAt: nowTs, updatedAt: nowTs })
      logActivity(uow, {
        actor: SYSTEM_ACTOR,
        subject: { type: "booking", id },
        action: "booking.cancelled",
        message: `Booking ${booking.code} dibatalkan otomatis karena batas waktu ${booking.status === "pending" ? "verifikasi" : "pembayaran DP"} terlewati`,
      })
    }
    for (const id of fresh.completeBookings) {
      const booking = uow.bookings.require(id)
      uow.bookings.update(id, { status: "completed", completedAt: nowTs, updatedAt: nowTs })
      logActivity(uow, {
        actor: SYSTEM_ACTOR,
        subject: { type: "booking", id },
        action: "booking.completed",
        message: `Trip selesai, booking ${booking.code} ditandai Selesai`,
      })
    }
  })
  return work
}
