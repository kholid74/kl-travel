import { addDays, rangesOverlap, toDateOnlyWIB, type DateOnly } from "@/lib/dates"
import { formatDateRange } from "@/lib/format"
import { createId } from "@/lib/ids"
import { DomainError } from "@/lib/result"
import type { Departure, TourPackage } from "@/domain/entities"
import { isHoldActive, minimumCapacity } from "@/domain/rules/availability"
import { checklistTemplate } from "@/domain/rules/trip-readiness"
import type { ID, IDR } from "@/domain/types/common"
import type { UnitOfWork } from "@/repositories"
import { logActivity } from "./activity-log"
import { requirePermission, userActor } from "./authz"
import { applyCancellation } from "./booking-effects"
import { runCommand } from "./runtime"

/** Seats taken (confirmed/completed) and held (live holds) on a departure, read through the unit of work. */
export function seatsOf(uow: UnitOfWork, departureId: ID) {
  let allocated = 0
  let held = 0
  for (const booking of uow.bookings.find((b) => b.departureId === departureId)) {
    const pax = uow.bookingTravelers.find((bt) => bt.bookingId === booking.id).length
    if (booking.status === "confirmed" || booking.status === "completed") allocated += pax
    else if (isHoldActive(booking, uow.now)) held += pax
  }
  return { allocated, held }
}

function departureCode(uow: UnitOfWork, pkg: TourPackage, startDate: DateOnly): string {
  const base = `${pkg.code.replace(/^NV-/, "")}-${startDate.slice(2).replaceAll("-", "")}`
  const taken = new Set(uow.departures.list().map((d) => d.code))
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

/** Guide double-booking check (invariant 11). Returns the clashing departure, if any. */
export function guideConflict(uow: UnitOfWork, guideId: ID, range: { startDate: DateOnly; endDate: DateOnly }, exceptId?: ID) {
  return uow.departures.find(
    (d) => d.id !== exceptId && d.guideId === guideId && !d.cancelledAt && rangesOverlap(d.startDate, d.endDate, range.startDate, range.endDate),
  )[0]
}

/**
 * Creates a departure with its own copy of the package cost template and a fresh
 * operations checklist (docs/domain-model.md §4.2, §6.9).
 */
export function createDepartureRecord(
  uow: UnitOfWork,
  input: {
    pkg: TourPackage
    kind: Departure["kind"]
    startDate: DateOnly
    capacity: number
    minParticipants: number
    pricePerPaxOverride?: IDR
    guideId?: ID
    notes?: string
  },
): Departure {
  const { pkg } = input
  const endDate = addDays(input.startDate, pkg.durationDays - 1)
  if (input.guideId) {
    const clash = guideConflict(uow, input.guideId, { startDate: input.startDate, endDate })
    if (clash) throw new DomainError("CONFLICT", `Guide sudah bertugas di ${clash.code} (${formatDateRange(clash.startDate, clash.endDate)}).`, "guideId")
  }
  const departure: Departure = {
    id: createId("dep"),
    code: departureCode(uow, pkg, input.startDate),
    packageId: pkg.id,
    kind: input.kind,
    startDate: input.startDate,
    endDate,
    capacity: input.capacity,
    minParticipants: input.minParticipants,
    pricePerPaxOverride: input.pricePerPaxOverride || undefined,
    salesClosed: false,
    guideId: input.guideId,
    notes: input.notes?.trim() || undefined,
    createdAt: uow.now,
    updatedAt: uow.now,
  }
  uow.departures.insert(departure)
  for (const item of uow.costItems.find((c) => c.owner.type === "package" && c.owner.packageId === pkg.id)) {
    uow.costItems.insert({
      id: createId("cst"),
      owner: { type: "departure", departureId: departure.id },
      category: item.category,
      label: item.label,
      basis: item.basis,
      unitCost: item.unitCost,
      quantity: item.quantity,
      vendorId: item.vendorId,
      createdAt: uow.now,
      updatedAt: uow.now,
    })
  }
  uow.checklists.insert({ id: createId("chk"), departureId: departure.id, items: checklistTemplate(pkg), createdAt: uow.now, updatedAt: uow.now })
  return departure
}

export interface DepartureInput {
  packageId: ID
  startDate: DateOnly
  capacity: number
  minParticipants: number
  pricePerPaxOverride?: IDR
  guideId?: ID
  notes?: string
}

function validateSchedule(uow: UnitOfWork, input: Pick<DepartureInput, "startDate" | "capacity" | "minParticipants">) {
  if (input.startDate <= toDateOnlyWIB(uow.now)) throw new DomainError("VALIDATION", "Tanggal berangkat harus setelah hari ini.", "startDate")
  if (!Number.isInteger(input.capacity) || input.capacity < 1) throw new DomainError("VALIDATION", "Kapasitas minimal 1 kursi.", "capacity")
  if (input.minParticipants < 1 || input.minParticipants > input.capacity) {
    throw new DomainError("VALIDATION", "Peserta minimum harus antara 1 dan kapasitas.", "minParticipants")
  }
}

/** New scheduled (Open Trip) departure. */
export function createDeparture(uow: UnitOfWork, userId: ID, input: DepartureInput): Departure {
  requirePermission(uow, userId, "departures.manage")
  const pkg = uow.packages.require(input.packageId)
  if (pkg.tripType !== "open") throw new DomainError("VALIDATION", "Jadwal tetap hanya untuk paket Open Trip.", "packageId")
  if (pkg.status === "archived") throw new DomainError("VALIDATION", "Paket yang diarsipkan tidak bisa dijadwalkan.", "packageId")
  validateSchedule(uow, input)
  const departure = createDepartureRecord(uow, { pkg, kind: "scheduled", ...input })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "departure", id: departure.id },
    related: [{ type: "package", id: pkg.id }],
    action: "departure.created",
    message: `Keberangkatan ${departure.code} dibuat: ${formatDateRange(departure.startDate, departure.endDate)}, ${departure.capacity} kursi`,
  })
  return departure
}

export interface DepartureUpdate {
  capacity?: number
  minParticipants?: number
  pricePerPaxOverride?: IDR | null
  startDate?: DateOnly
  notes?: string
}

/**
 * Edits a departure. Capacity cannot drop below seats already taken or held (§6.1), and the
 * date can only move while nobody is booked on it.
 */
export function updateDeparture(uow: UnitOfWork, userId: ID, departureId: ID, patch: DepartureUpdate): Departure {
  requirePermission(uow, userId, "departures.manage")
  const departure = uow.departures.require(departureId)
  if (departure.cancelledAt) throw new DomainError("INVALID_TRANSITION", "Keberangkatan yang dibatalkan tidak dapat diubah.")
  const pkg = uow.packages.require(departure.packageId)
  const seats = seatsOf(uow, departure.id)
  const next: Partial<Departure> = { updatedAt: uow.now }
  const changes: string[] = []

  if (patch.capacity !== undefined && patch.capacity !== departure.capacity) {
    if (departure.kind === "private") throw new DomainError("VALIDATION", "Kapasitas keberangkatan privat mengikuti jumlah peserta booking.", "capacity")
    const floor = minimumCapacity(seats)
    if (!Number.isInteger(patch.capacity) || patch.capacity < floor) {
      throw new DomainError("VALIDATION", `Kapasitas minimal ${floor}: ${seats.allocated} kursi terkonfirmasi dan ${seats.held} ditahan.`, "capacity")
    }
    next.capacity = patch.capacity
    changes.push(`kapasitas ${departure.capacity} → ${patch.capacity}`)
  }
  const capacity = next.capacity ?? departure.capacity
  if (patch.minParticipants !== undefined && patch.minParticipants !== departure.minParticipants) {
    if (patch.minParticipants < 1 || patch.minParticipants > capacity) {
      throw new DomainError("VALIDATION", "Peserta minimum harus antara 1 dan kapasitas.", "minParticipants")
    }
    next.minParticipants = patch.minParticipants
    changes.push(`peserta minimum ${patch.minParticipants}`)
  }
  if (patch.pricePerPaxOverride !== undefined && (patch.pricePerPaxOverride ?? undefined) !== departure.pricePerPaxOverride) {
    next.pricePerPaxOverride = patch.pricePerPaxOverride || undefined
    changes.push(patch.pricePerPaxOverride ? "harga khusus diubah" : "harga khusus dihapus")
  }
  if (patch.startDate && patch.startDate !== departure.startDate) {
    const active = uow.bookings.find((b) => b.departureId === departure.id && b.status !== "cancelled")
    if (active.length) throw new DomainError("VALIDATION", "Tanggal tidak bisa diubah karena sudah ada booking aktif.", "startDate")
    validateSchedule(uow, { startDate: patch.startDate, capacity, minParticipants: next.minParticipants ?? departure.minParticipants })
    next.startDate = patch.startDate
    next.endDate = addDays(patch.startDate, pkg.durationDays - 1)
    if (departure.guideId && guideConflict(uow, departure.guideId, { startDate: next.startDate, endDate: next.endDate }, departure.id)) {
      throw new DomainError("CONFLICT", "Guide yang ditugaskan sudah bertugas di tanggal baru tersebut.", "startDate")
    }
    changes.push(`tanggal ${formatDateRange(next.startDate, next.endDate)}`)
  }
  if (patch.notes !== undefined && (patch.notes.trim() || undefined) !== departure.notes) {
    next.notes = patch.notes.trim() || undefined
    changes.push("catatan diperbarui")
  }
  if (changes.length === 0) return departure
  const updated = uow.departures.update(departure.id, next)
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "departure", id: departure.id },
    action: "departure.updated",
    message: `Keberangkatan ${departure.code} diperbarui: ${changes.join(", ")}`,
  })
  return updated
}

export function setSalesClosed(uow: UnitOfWork, userId: ID, departureId: ID, closed: boolean, reason?: string): Departure {
  requirePermission(uow, userId, "departures.manage")
  const departure = uow.departures.require(departureId)
  if (departure.cancelledAt) throw new DomainError("INVALID_TRANSITION", "Keberangkatan sudah dibatalkan.")
  if (closed && !reason?.trim()) throw new DomainError("VALIDATION", "Tuliskan alasan penutupan penjualan.", "reason")
  const updated = uow.departures.update(departure.id, {
    salesClosed: closed,
    salesClosedReason: closed ? reason!.trim() : undefined,
    updatedAt: uow.now,
  })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "departure", id: departure.id },
    action: closed ? "departure.sales_closed" : "departure.sales_reopened",
    message: closed ? `Penjualan ${departure.code} ditutup: ${reason!.trim()}` : `Penjualan ${departure.code} dibuka kembali`,
  })
  return updated
}

/** Cancels a scheduled departure and every active booking on it, without fees (§6.6). */
export function cancelDeparture(uow: UnitOfWork, userId: ID, departureId: ID, reason: string): { cancelledBookings: number } {
  requirePermission(uow, userId, "departures.manage")
  const departure = uow.departures.require(departureId)
  if (departure.cancelledAt) throw new DomainError("INVALID_TRANSITION", "Keberangkatan sudah dibatalkan.")
  if (departure.kind === "private") throw new DomainError("INVALID_TRANSITION", "Keberangkatan privat dibatalkan melalui booking-nya.")
  if (departure.startDate <= toDateOnlyWIB(uow.now)) throw new DomainError("INVALID_TRANSITION", "Keberangkatan yang sudah berjalan tidak dapat dibatalkan.")
  if (!reason.trim()) throw new DomainError("VALIDATION", "Tuliskan alasan pembatalan.", "reason")

  const actor = userActor(userId)
  const active = uow.bookings.find((b) => b.departureId === departure.id && b.status !== "cancelled" && b.status !== "completed")
  for (const booking of active) applyCancellation(uow, booking.id, { reason: "departure_cancelled", actor, note: reason })
  uow.departures.update(departure.id, { cancelledAt: uow.now, cancellationReason: reason.trim(), updatedAt: uow.now })
  logActivity(uow, {
    actor,
    subject: { type: "departure", id: departure.id },
    action: "departure.cancelled",
    message: `Keberangkatan ${departure.code} dibatalkan: ${reason.trim()}` + (active.length ? ` (${active.length} booking ikut dibatalkan)` : ""),
  })
  return { cancelledBookings: active.length }
}

/** Assigns or removes the guide, refusing overlapping assignments (invariant 11). */
export function assignGuide(uow: UnitOfWork, userId: ID, departureId: ID, guideId: ID | null): Departure {
  requirePermission(uow, userId, "departures.manage")
  const departure = uow.departures.require(departureId)
  if (departure.cancelledAt) throw new DomainError("INVALID_TRANSITION", "Keberangkatan sudah dibatalkan.")
  if (guideId) {
    const guide = uow.guides.require(guideId)
    if (guide.status !== "active") throw new DomainError("VALIDATION", `${guide.name} sedang tidak aktif.`, "guideId")
    const clash = guideConflict(uow, guideId, departure, departure.id)
    if (clash) {
      throw new DomainError("CONFLICT", `${guide.name} sudah bertugas di ${clash.code} (${formatDateRange(clash.startDate, clash.endDate)}).`, "guideId")
    }
  }
  const updated = uow.departures.update(departure.id, { guideId: guideId ?? undefined, updatedAt: uow.now })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "departure", id: departure.id },
    related: guideId ? [{ type: "guide", id: guideId }] : [],
    action: "departure.guide_assigned",
    message: guideId ? `${uow.guides.require(guideId).name} ditugaskan ke ${departure.code}` : `Guide dilepas dari ${departure.code}`,
  })
  return updated
}

export const departureCommands = {
  create: (userId: ID, input: DepartureInput) => runCommand((uow) => createDeparture(uow, userId, input)),
  update: (userId: ID, departureId: ID, patch: DepartureUpdate) => runCommand((uow) => updateDeparture(uow, userId, departureId, patch)),
  setSalesClosed: (userId: ID, departureId: ID, closed: boolean, reason?: string) =>
    runCommand((uow) => setSalesClosed(uow, userId, departureId, closed, reason)),
  cancel: (userId: ID, departureId: ID, reason: string) => runCommand((uow) => cancelDeparture(uow, userId, departureId, reason)),
  assignGuide: (userId: ID, departureId: ID, guideId: ID | null) => runCommand((uow) => assignGuide(uow, userId, departureId, guideId)),
}
