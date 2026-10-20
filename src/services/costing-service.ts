import { toDateOnlyWIB } from "@/lib/dates"
import { formatIDR } from "@/lib/format"
import { createId } from "@/lib/ids"
import { DomainError } from "@/lib/result"
import type { CostCategory, CostItem, CostOwner } from "@/domain/entities"
import { costTotals } from "@/domain/rules/costing"
import type { ID, IDR } from "@/domain/types/common"
import type { UnitOfWork } from "@/repositories"
import { logActivity } from "./activity-log"
import { requirePermission, userActor } from "./authz"
import { runCommand } from "./runtime"

export interface CostItemInput {
  /** Present when the line already exists; its recorded actual amount is kept. */
  id?: ID
  category: CostCategory
  label: string
  basis: CostItem["basis"]
  unitCost: IDR
  quantity: number
  vendorId?: ID
}

const ownedBy = (owner: CostOwner) => (item: CostItem) =>
  owner.type === "package"
    ? item.owner.type === "package" && item.owner.packageId === owner.packageId
    : item.owner.type === "departure" && item.owner.departureId === owner.departureId

function describeOwner(uow: UnitOfWork, owner: CostOwner) {
  if (owner.type === "package") {
    const pkg = uow.packages.require(owner.packageId)
    return { subject: { type: "package" as const, id: pkg.id }, name: `template biaya ${pkg.title}` }
  }
  const departure = uow.departures.require(owner.departureId)
  if (departure.cancelledAt) throw new DomainError("INVALID_TRANSITION", "Keberangkatan sudah dibatalkan.")
  return { subject: { type: "departure" as const, id: departure.id }, name: `estimasi biaya ${departure.code}` }
}

/**
 * Replaces the estimated cost lines of a package template or a departure (§4.2). A package
 * template only affects departures created afterwards.
 */
export function saveCostItems(uow: UnitOfWork, userId: ID, owner: CostOwner, items: CostItemInput[]) {
  requirePermission(uow, userId, "costing.manage")
  const { subject, name } = describeOwner(uow, owner)
  items.forEach((item, index) => {
    const row = `Baris ${index + 1}`
    if (!item.label.trim()) throw new DomainError("VALIDATION", `${row}: isi nama komponen biaya.`)
    if (!Number.isInteger(item.unitCost) || item.unitCost < 0) throw new DomainError("VALIDATION", `${row}: biaya satuan tidak valid.`)
    if (!Number.isInteger(item.quantity) || item.quantity < 1) throw new DomainError("VALIDATION", `${row}: jumlah minimal 1.`)
    if (item.vendorId) uow.vendors.require(item.vendorId)
  })

  const existing = new Map(uow.costItems.find(ownedBy(owner)).map((item) => [item.id, item]))
  const kept = new Set<ID>()
  for (const input of items) {
    const fields = {
      category: input.category,
      label: input.label.trim(),
      basis: input.basis,
      unitCost: input.unitCost,
      quantity: input.quantity,
      vendorId: input.vendorId || undefined,
    }
    if (input.id && existing.has(input.id)) {
      kept.add(input.id)
      uow.costItems.update(input.id, { ...fields, updatedAt: uow.now })
    } else {
      uow.costItems.insert({ id: createId("cst"), owner, ...fields, createdAt: uow.now, updatedAt: uow.now })
    }
  }
  for (const id of existing.keys()) if (!kept.has(id)) uow.costItems.remove(id)

  const totals = costTotals(items)
  logActivity(uow, {
    actor: userActor(userId),
    subject,
    action: "costing.updated",
    message: `${name[0].toUpperCase()}${name.slice(1)} diperbarui: biaya tetap ${formatIDR(totals.fixed)}, biaya per peserta ${formatIDR(totals.perPax)}`,
  })
  return totals
}

/** Actual spend per cost line, entered once the trip has started. `null` clears a value. */
export function recordActualCosts(uow: UnitOfWork, userId: ID, departureId: ID, actuals: { id: ID; actualAmount: IDR | null }[]) {
  requirePermission(uow, userId, "costing.manage")
  const departure = uow.departures.require(departureId)
  if (departure.cancelledAt) throw new DomainError("INVALID_TRANSITION", "Keberangkatan sudah dibatalkan.")
  if (toDateOnlyWIB(uow.now) < departure.startDate) throw new DomainError("INVALID_TRANSITION", "Biaya aktual dicatat setelah trip berjalan.")
  for (const { id, actualAmount } of actuals) {
    const item = uow.costItems.require(id)
    if (item.owner.type !== "departure" || item.owner.departureId !== departure.id) throw new DomainError("VALIDATION", "Komponen biaya bukan milik keberangkatan ini.")
    if (actualAmount !== null && (!Number.isInteger(actualAmount) || actualAmount < 0)) {
      throw new DomainError("VALIDATION", `Biaya aktual "${item.label}" tidak valid.`)
    }
    uow.costItems.update(id, { actualAmount: actualAmount ?? undefined, updatedAt: uow.now })
  }
  const lines = uow.costItems.find(ownedBy({ type: "departure", departureId: departure.id }))
  const filled = lines.filter((item) => item.actualAmount !== undefined).length
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "departure", id: departure.id },
    action: "costing.actuals_recorded",
    message: `Biaya aktual ${departure.code} dicatat (${filled} dari ${lines.length} komponen terisi)`,
  })
  return { filled, total: lines.length }
}

export const costingCommands = {
  save: (userId: ID, owner: CostOwner, items: CostItemInput[]) => runCommand((uow) => saveCostItems(uow, userId, owner, items)),
  recordActuals: (userId: ID, departureId: ID, actuals: { id: ID; actualAmount: IDR | null }[]) =>
    runCommand((uow) => recordActualCosts(uow, userId, departureId, actuals)),
}
