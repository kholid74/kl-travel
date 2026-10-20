import { createId, pad } from "@/lib/ids"
import { DomainError } from "@/lib/result"
import { SLUG_PATTERN, slugify } from "@/lib/slug"
import type { Destination, PackageStatus, TourPackage } from "@/domain/entities"
import { PACKAGE_STATUS_LABEL } from "@/domain/labels"
import type { ID } from "@/domain/types/common"
import type { UnitOfWork } from "@/repositories"
import { logActivity } from "./activity-log"
import { requirePermission, userActor } from "./authz"
import { runCommand } from "./runtime"

/** Everything the package editor controls. Code, status and timestamps are managed here. */
export type PackageInput = Omit<TourPackage, "id" | "code" | "status" | "publishedAt" | "visibility" | "sourceQuotationId" | "createdAt" | "updatedAt">

export type DestinationInput = Omit<Destination, "id" | "status" | "createdAt" | "updatedAt">

function uniqueSlug(taken: (slug: string) => boolean, wanted: string): string {
  if (!taken(wanted)) return wanted
  let n = 2
  while (taken(`${wanted}-${n}`)) n++
  return `${wanted}-${n}`
}

/** "NV-LBJ-OT03": the destination prefix used by its other packages, else its initials. */
function packageCode(uow: UnitOfWork, destinationId: ID, tripType: TourPackage["tripType"]): string {
  const siblings = uow.packages.find((p) => p.destinationId === destinationId && !p.code.startsWith("NV-CUS-"))
  const destination = uow.destinations.require(destinationId)
  const prefix = siblings[0]?.code.split("-")[1] ?? slugify(destination.name).replace(/-/g, "").slice(0, 3).toUpperCase()
  const kind = tripType === "open" ? "OT" : "PT"
  const used = new Set(uow.packages.list().map((p) => p.code))
  let n = siblings.filter((p) => p.code.includes(`-${kind}`)).length + 1
  while (used.has(`NV-${prefix}-${kind}${pad(n, 2)}`)) n++
  return `NV-${prefix}-${kind}${pad(n, 2)}`
}

/** Problems that block publishing (invariant 12), in the order the editor shows them. */
export function publishBlockers(pkg: Pick<TourPackage, "itinerary" | "coverMediaId" | "pricing" | "destinationId">, destination?: Pick<Destination, "status">): string[] {
  const blockers: string[] = []
  if (pkg.itinerary.length === 0) blockers.push("Tambahkan minimal satu hari itinerary.")
  if (!pkg.coverMediaId) blockers.push("Pilih foto sampul.")
  const pricing = pkg.pricing
  const validPrice =
    pricing.kind === "quoted" ||
    (pricing.kind === "per_pax" && pricing.pricePerPax > 0) ||
    (pricing.kind === "tiered" && pricing.tiers.length > 0 && pricing.tiers.every((t) => t.pricePerPax > 0 && t.minPax <= t.maxPax))
  if (!validPrice) blockers.push("Lengkapi harga paket.")
  if (destination?.status !== "published") blockers.push("Destinasi paket belum dipublikasikan.")
  return blockers
}

function validatePackage(uow: UnitOfWork, input: PackageInput, exceptId?: ID) {
  if (input.title.trim().length < 3) throw new DomainError("VALIDATION", "Judul paket minimal 3 karakter.", "title")
  if (!SLUG_PATTERN.test(input.slug)) throw new DomainError("VALIDATION", "Slug hanya boleh huruf kecil, angka, dan tanda hubung.", "slug")
  if (uow.packages.find((p) => p.slug === input.slug && p.id !== exceptId).length) {
    throw new DomainError("CONFLICT", "Slug sudah dipakai paket lain.", "slug")
  }
  if (!uow.destinations.get(input.destinationId)) throw new DomainError("VALIDATION", "Pilih destinasi.", "destinationId")
  if (input.durationDays < 1 || input.durationNights < 0 || input.durationNights > input.durationDays) {
    throw new DomainError("VALIDATION", "Durasi tidak valid.", "durationDays")
  }
  if (input.groupSize.min < 1 || input.groupSize.min > input.groupSize.max) throw new DomainError("VALIDATION", "Ukuran grup tidak valid.", "groupSize")
  if (input.pricing.kind === "tiered") {
    const tiers = [...input.pricing.tiers].sort((a, b) => a.minPax - b.minPax)
    for (let i = 1; i < tiers.length; i++) {
      if (tiers[i].minPax <= tiers[i - 1].maxPax) throw new DomainError("VALIDATION", "Rentang peserta antar-tingkat harga tidak boleh tumpang tindih.", "pricing")
    }
  }
  if (input.paymentTerms.depositPercent < 1 || input.paymentTerms.depositPercent > 100) {
    throw new DomainError("VALIDATION", "Persentase DP harus 1–100.", "paymentTerms")
  }
}

function clean(input: PackageInput): PackageInput {
  return {
    ...input,
    title: input.title.trim(),
    summary: input.summary.trim(),
    overview: input.overview.map((p) => p.trim()).filter(Boolean),
    highlights: input.highlights.map((h) => h.trim()).filter(Boolean),
    inclusions: input.inclusions.map((i) => i.trim()).filter(Boolean),
    exclusions: input.exclusions.map((e) => e.trim()).filter(Boolean),
    terms: input.terms.map((t) => t.trim()).filter(Boolean),
    itinerary: input.itinerary.map((day, index) => ({ ...day, day: index + 1, title: day.title.trim(), activities: day.activities.filter(Boolean) })),
    galleryMediaIds: input.galleryMediaIds.filter((id) => id !== input.coverMediaId),
  }
}

/** Creates a draft package or updates an existing one. */
export function savePackage(uow: UnitOfWork, userId: ID, input: PackageInput, packageId?: ID): TourPackage {
  requirePermission(uow, userId, "packages.manage")
  const values = clean(input)
  if (packageId) {
    const existing = uow.packages.require(packageId)
    if (values.tripType !== existing.tripType) throw new DomainError("VALIDATION", "Jenis trip tidak bisa diubah setelah paket dibuat.", "tripType")
    validatePackage(uow, values, existing.id)
    if (existing.status === "published") {
      const blockers = publishBlockers(values, uow.destinations.get(values.destinationId))
      if (blockers.length) throw new DomainError("VALIDATION", `Paket terbit tidak bisa disimpan: ${blockers[0]}`)
    }
    const updated = uow.packages.update(existing.id, { ...values, updatedAt: uow.now })
    logActivity(uow, {
      actor: userActor(userId),
      subject: { type: "package", id: existing.id },
      action: "package.updated",
      message: `Paket ${updated.title} diperbarui`,
    })
    return updated
  }
  if (values.tripType === "custom") throw new DomainError("VALIDATION", "Paket custom dibuat dari penawaran yang disetujui.", "tripType")
  const slug = uniqueSlug((s) => uow.packages.find((p) => p.slug === s).length > 0, values.slug || slugify(values.title))
  const created: TourPackage = {
    ...values,
    slug,
    id: createId("pkg"),
    code: packageCode(uow, values.destinationId, values.tripType),
    status: "draft",
    visibility: "catalog",
    createdAt: uow.now,
    updatedAt: uow.now,
  }
  validatePackage(uow, created)
  uow.packages.insert(created)
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "package", id: created.id },
    action: "package.created",
    message: `Paket ${created.title} dibuat sebagai draf`,
  })
  return created
}

/**
 * draft → published → archived, and back to draft (§5.5). Publishing checks invariant 12.
 * Archiving keeps existing departures but closes their sales.
 */
export function setPackageStatus(uow: UnitOfWork, userId: ID, packageId: ID, status: PackageStatus): TourPackage {
  const pkg = uow.packages.require(packageId)
  requirePermission(uow, userId, status === "archived" || pkg.status === "archived" ? "packages.manage" : "packages.publish")
  if (pkg.status === status) return pkg
  if (pkg.status === "archived" && status === "published") throw new DomainError("INVALID_TRANSITION", "Kembalikan paket ke draf sebelum memublikasikannya.")
  if (status === "published") {
    const blockers = publishBlockers(pkg, uow.destinations.get(pkg.destinationId))
    if (blockers.length) throw new DomainError("VALIDATION", blockers.join(" "))
  }
  const updated = uow.packages.update(pkg.id, {
    status,
    publishedAt: status === "published" ? uow.now : pkg.publishedAt,
    updatedAt: uow.now,
  })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "package", id: pkg.id },
    action: `package.${status}`,
    message: `Status paket ${pkg.title}: ${PACKAGE_STATUS_LABEL[pkg.status]} → ${PACKAGE_STATUS_LABEL[status]}`,
  })
  return updated
}

function validateDestination(uow: UnitOfWork, input: DestinationInput, exceptId?: ID) {
  if (input.name.trim().length < 2) throw new DomainError("VALIDATION", "Isi nama destinasi.", "name")
  if (!SLUG_PATTERN.test(input.slug)) throw new DomainError("VALIDATION", "Slug hanya boleh huruf kecil, angka, dan tanda hubung.", "slug")
  if (uow.destinations.find((d) => d.slug === input.slug && d.id !== exceptId).length) {
    throw new DomainError("CONFLICT", "Slug sudah dipakai destinasi lain.", "slug")
  }
  if (input.categories.length === 0) throw new DomainError("VALIDATION", "Pilih minimal satu kategori.", "categories")
  if (input.summary.trim().length > 180) throw new DomainError("VALIDATION", "Ringkasan maksimal 180 karakter.", "summary")
}

export function saveDestination(uow: UnitOfWork, userId: ID, input: DestinationInput, destinationId?: ID): Destination {
  requirePermission(uow, userId, "packages.manage")
  const values: DestinationInput = {
    ...input,
    name: input.name.trim(),
    description: input.description.map((p) => p.trim()).filter(Boolean),
    highlights: input.highlights.map((h) => h.trim()).filter(Boolean),
    galleryMediaIds: input.galleryMediaIds.filter((id) => id !== input.coverMediaId),
  }
  if (destinationId) {
    const existing = uow.destinations.require(destinationId)
    validateDestination(uow, values, existing.id)
    const updated = uow.destinations.update(existing.id, { ...values, updatedAt: uow.now })
    logActivity(uow, { actor: userActor(userId), subject: { type: "destination", id: existing.id }, action: "destination.updated", message: `Destinasi ${updated.name} diperbarui` })
    return updated
  }
  const slug = uniqueSlug((s) => uow.destinations.find((d) => d.slug === s).length > 0, values.slug || slugify(values.name))
  const created: Destination = { ...values, slug, id: createId("dst"), status: "draft", createdAt: uow.now, updatedAt: uow.now }
  validateDestination(uow, created)
  uow.destinations.insert(created)
  logActivity(uow, { actor: userActor(userId), subject: { type: "destination", id: created.id }, action: "destination.created", message: `Destinasi ${created.name} dibuat sebagai draf` })
  return created
}

export function setDestinationStatus(uow: UnitOfWork, userId: ID, destinationId: ID, status: Destination["status"]): Destination {
  requirePermission(uow, userId, "packages.publish")
  const destination = uow.destinations.require(destinationId)
  if (destination.status === status) return destination
  if (status === "published") {
    if (!destination.coverMediaId) throw new DomainError("VALIDATION", "Pilih foto sampul terlebih dahulu.")
    if (destination.description.length === 0) throw new DomainError("VALIDATION", "Tulis deskripsi destinasi terlebih dahulu.")
  } else {
    const live = uow.packages.find((p) => p.destinationId === destination.id && p.status === "published")
    if (live.length) throw new DomainError("INVALID_TRANSITION", `Masih ada ${live.length} paket terbit di destinasi ini. Ubah statusnya terlebih dahulu.`)
  }
  const updated = uow.destinations.update(destination.id, { status, updatedAt: uow.now })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "destination", id: destination.id },
    action: `destination.${status}`,
    message: status === "published" ? `Destinasi ${destination.name} dipublikasikan` : `Destinasi ${destination.name} dikembalikan ke draf`,
  })
  return updated
}

export const catalogCommands = {
  savePackage: (userId: ID, input: PackageInput, packageId?: ID) => runCommand((uow) => savePackage(uow, userId, input, packageId)),
  setPackageStatus: (userId: ID, packageId: ID, status: PackageStatus) => runCommand((uow) => setPackageStatus(uow, userId, packageId, status)),
  saveDestination: (userId: ID, input: DestinationInput, destinationId?: ID) => runCommand((uow) => saveDestination(uow, userId, input, destinationId)),
  setDestinationStatus: (userId: ID, destinationId: ID, status: Destination["status"]) =>
    runCommand((uow) => setDestinationStatus(uow, userId, destinationId, status)),
}
