import { toDateOnlyWIB } from "@/lib/dates"
import { createId } from "@/lib/ids"
import { DomainError } from "@/lib/result"
import type { ChecklistKey, Departure } from "@/domain/entities"
import { VENDOR_ASSIGNMENT_STATUS_LABEL } from "@/domain/labels"
import { checklistBlocker, checklistContext } from "@/domain/rules/trip-readiness"
import type { ID } from "@/domain/types/common"
import type { UnitOfWork } from "@/repositories"
import { logActivity } from "./activity-log"
import { requirePermission, userActor } from "./authz"
import { runCommand } from "./runtime"

function requireOpenDeparture(uow: UnitOfWork, departureId: ID): Departure {
  const departure = uow.departures.require(departureId)
  if (departure.cancelledAt) throw new DomainError("INVALID_TRANSITION", "Keberangkatan sudah dibatalkan.")
  return departure
}

function contextOf(uow: UnitOfWork, departure: Departure) {
  return checklistContext({
    departure,
    checklist: uow.checklists.find((c) => c.departureId === departure.id)[0],
    bookings: uow.bookings.find((b) => b.departureId === departure.id),
    travelersOf: (bookingId) =>
      uow.bookingTravelers
        .find((bt) => bt.bookingId === bookingId)
        .map((bt) => uow.travelers.require(bt.travelerId)),
    assignments: uow.vendorAssignments.find((a) => a.departureId === departure.id),
    now: uow.now,
  })
}

/**
 * Ticks or unticks one checklist item. Ticking is refused while its dependency is open
 * (docs/domain-model.md §6.9); unticking traveler data also reopens the manifest.
 */
export function setChecklistItem(uow: UnitOfWork, userId: ID, departureId: ID, key: ChecklistKey, done: boolean) {
  requirePermission(uow, userId, "operations.manage")
  const departure = requireOpenDeparture(uow, departureId)
  const checklist = uow.checklists.find((c) => c.departureId === departure.id)[0]
  const item = checklist?.items.find((i) => i.key === key)
  if (!checklist || !item) throw new DomainError("NOT_FOUND", "Item checklist tidak ditemukan.")
  if (item.done === done) return { reopened: [] as string[] }

  if (done) {
    const blocker = checklistBlocker(key, contextOf(uow, departure))
    if (blocker) throw new DomainError("VALIDATION", blocker)
  }
  const reopened: string[] = []
  const items = checklist.items.map((i) => {
    if (i.key === key) return done ? { ...i, done, doneAt: uow.now, doneBy: userId } : { ...i, done, doneAt: undefined, doneBy: undefined }
    if (!done && key === "traveler_data" && i.key === "manifest" && i.done) {
      reopened.push(i.label)
      return { ...i, done: false, doneAt: undefined, doneBy: undefined }
    }
    return i
  })
  uow.checklists.update(checklist.id, { items, updatedAt: uow.now })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "departure", id: departure.id },
    action: done ? "operations.checklist_done" : "operations.checklist_reopened",
    message: done
      ? `"${item.label}" selesai untuk ${departure.code}`
      : `"${item.label}" dibuka kembali untuk ${departure.code}` + (reopened.length ? `, termasuk ${reopened.join(", ")}` : ""),
  })
  return { reopened }
}

export function setChecklistNote(uow: UnitOfWork, userId: ID, departureId: ID, key: ChecklistKey, note: string) {
  requirePermission(uow, userId, "operations.manage")
  const departure = requireOpenDeparture(uow, departureId)
  const checklist = uow.checklists.find((c) => c.departureId === departure.id)[0]
  if (!checklist?.items.some((i) => i.key === key)) throw new DomainError("NOT_FOUND", "Item checklist tidak ditemukan.")
  const items = checklist.items.map((i) => (i.key === key ? { ...i, note: note.trim() || undefined } : i))
  uow.checklists.update(checklist.id, { items, updatedAt: uow.now })
}

/** Requests a vendor for this departure; the service follows the vendor's category. */
export function assignVendor(uow: UnitOfWork, userId: ID, departureId: ID, input: { vendorId: ID; note?: string }) {
  requirePermission(uow, userId, "operations.manage")
  const departure = requireOpenDeparture(uow, departureId)
  if (toDateOnlyWIB(uow.now) > departure.endDate) throw new DomainError("INVALID_TRANSITION", "Trip sudah selesai.")
  const vendor = uow.vendors.require(input.vendorId)
  const existing = uow.vendorAssignments.find((a) => a.departureId === departure.id && a.vendorId === vendor.id && a.status !== "cancelled")
  if (existing.length) throw new DomainError("CONFLICT", `${vendor.name} sudah ditugaskan ke keberangkatan ini.`, "vendorId")
  const assignment = uow.vendorAssignments.insert({
    id: createId("vas"),
    departureId: departure.id,
    vendorId: vendor.id,
    service: vendor.category,
    status: "requested",
    note: input.note?.trim() || undefined,
    createdAt: uow.now,
    updatedAt: uow.now,
  })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "departure", id: departure.id },
    related: [{ type: "vendor", id: vendor.id }],
    action: "operations.vendor_requested",
    message: `${vendor.name} diminta untuk ${departure.code} (simulasi, tanpa pesan ke vendor)`,
  })
  return assignment
}

/** requested → confirmed | cancelled, confirmed → cancelled. */
export function setVendorAssignmentStatus(uow: UnitOfWork, userId: ID, assignmentId: ID, status: "confirmed" | "cancelled") {
  requirePermission(uow, userId, "operations.manage")
  const assignment = uow.vendorAssignments.require(assignmentId)
  const departure = requireOpenDeparture(uow, assignment.departureId)
  if (assignment.status === "cancelled") throw new DomainError("INVALID_TRANSITION", "Penugasan ini sudah dibatalkan. Tambahkan vendor kembali bila perlu.")
  if (assignment.status === status) return assignment
  const vendor = uow.vendors.require(assignment.vendorId)
  const updated = uow.vendorAssignments.update(assignment.id, { status, updatedAt: uow.now })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "departure", id: departure.id },
    related: [{ type: "vendor", id: vendor.id }],
    action: `operations.vendor_${status}`,
    message: `${vendor.name} ${VENDOR_ASSIGNMENT_STATUS_LABEL[status].toLowerCase()} untuk ${departure.code}`,
  })
  return updated
}

export const operationsCommands = {
  setChecklistItem: (userId: ID, departureId: ID, key: ChecklistKey, done: boolean) =>
    runCommand((uow) => setChecklistItem(uow, userId, departureId, key, done)),
  setChecklistNote: (userId: ID, departureId: ID, key: ChecklistKey, note: string) =>
    runCommand((uow) => setChecklistNote(uow, userId, departureId, key, note)),
  assignVendor: (userId: ID, departureId: ID, input: { vendorId: ID; note?: string }) =>
    runCommand((uow) => assignVendor(uow, userId, departureId, input)),
  setVendorStatus: (userId: ID, assignmentId: ID, status: "confirmed" | "cancelled") =>
    runCommand((uow) => setVendorAssignmentStatus(uow, userId, assignmentId, status)),
}
