import { createId } from "@/lib/ids"
import { normalizeEmail, normalizePhone } from "@/lib/phone"
import { DomainError } from "@/lib/result"
import type { Customer } from "@/domain/entities"
import { findCustomerMatch } from "@/domain/rules/customer-identity"
import type { ID, Source } from "@/domain/types/common"
import type { UnitOfWork } from "@/repositories"
import { logActivity } from "./activity-log"
import { requirePermission, userActor } from "./authz"
import { nextCode } from "./codes"
import { runCommand } from "./runtime"

export interface ContactInput {
  fullName: string
  phone: string
  email?: string
  city?: string
  preferredContact?: Customer["preferredContact"]
}

export function addCustomerNote(uow: UnitOfWork, userId: ID, customerId: ID, body: string): Customer {
  requirePermission(uow, userId, "inquiries.manage")
  const customer = uow.customers.require(customerId)
  if (!body.trim()) throw new DomainError("VALIDATION", "Tuliskan catatan.", "body")
  const updated = uow.customers.update(customer.id, {
    notes: [...customer.notes, { id: createId("note"), body: body.trim(), authorId: userId, createdAt: uow.now }],
    updatedAt: uow.now,
  })
  logActivity(uow, { actor: userActor(userId), subject: { type: "customer", id: customer.id }, action: "customer.note_added", message: `Catatan ditambahkan untuk ${customer.fullName}` })
  return updated
}

/** Contact details stay unique across customers (invariant 9). */
export function updateCustomer(
  uow: UnitOfWork,
  userId: ID,
  customerId: ID,
  input: { fullName: string; phone: string; email: string; city: string; preferredContact: Customer["preferredContact"] },
): Customer {
  requirePermission(uow, userId, "inquiries.manage")
  const customer = uow.customers.require(customerId)
  const phone = normalizePhone(input.phone)
  if (!phone) throw new DomainError("VALIDATION", "Nomor telepon tidak valid.", "phone")
  const email = input.email.trim() ? normalizeEmail(input.email) : null
  if (input.email.trim() && !email) throw new DomainError("VALIDATION", "Alamat email tidak valid.", "email")
  if (input.fullName.trim().length < 3) throw new DomainError("VALIDATION", "Isi nama lengkap.", "fullName")
  if (uow.customers.find((c) => c.id !== customer.id && c.phone === phone).length) throw new DomainError("CONFLICT", "Nomor ini sudah dipakai pelanggan lain.", "phone")
  if (email && uow.customers.find((c) => c.id !== customer.id && c.email === email).length) throw new DomainError("CONFLICT", "Email ini sudah dipakai pelanggan lain.", "email")
  const updated = uow.customers.update(customer.id, {
    fullName: input.fullName.trim(),
    phone,
    email: email ?? undefined,
    city: input.city.trim() || undefined,
    preferredContact: input.preferredContact,
    updatedAt: uow.now,
  })
  logActivity(uow, { actor: userActor(userId), subject: { type: "customer", id: customer.id }, action: "customer.updated", message: `Data kontak ${updated.fullName} diperbarui` })
  return updated
}

export const customerCommands = {
  addNote: (userId: ID, customerId: ID, body: string) => runCommand((uow) => addCustomerNote(uow, userId, customerId, body)),
  update: (userId: ID, customerId: ID, input: Parameters<typeof updateCustomer>[3]) => runCommand((uow) => updateCustomer(uow, userId, customerId, input)),
}

/** Author id for notes written by the system rather than a team member. */
export const SYSTEM_NOTE_AUTHOR = "system"

/**
 * Finds the customer by normalised phone, then email, or creates one
 * (docs/domain-model.md §6.8). Existing names are never overwritten.
 */
export function resolveCustomer(uow: UnitOfWork, contact: ContactInput, source: Source): { customer: Customer; created: boolean } {
  const phone = normalizePhone(contact.phone)
  if (!phone) throw new DomainError("VALIDATION", "Nomor WhatsApp tidak valid.", "phone")
  const email = contact.email?.trim() ? normalizeEmail(contact.email) : null
  if (contact.email?.trim() && !email) throw new DomainError("VALIDATION", "Alamat email tidak valid.", "email")
  const fullName = contact.fullName.trim()

  const match = findCustomerMatch(uow.customers.list(), { phone, email: email ?? undefined })
  if (match) {
    const existing = uow.customers.require(match.id)
    const patch: Partial<Customer> = {}
    const emailTaken = email && uow.customers.find((c) => c.email === email && c.id !== existing.id).length > 0
    if (!existing.email && email && !emailTaken) patch.email = email
    if (!existing.city && contact.city?.trim()) patch.city = contact.city.trim()
    if (existing.fullName.toLowerCase() !== fullName.toLowerCase()) {
      patch.notes = [
        ...existing.notes,
        {
          id: createId("note"),
          body: `Formulir website diisi dengan nama "${fullName}". Nama pelanggan tidak diubah.`,
          authorId: SYSTEM_NOTE_AUTHOR,
          createdAt: uow.now,
        },
      ]
    }
    const customer = Object.keys(patch).length ? uow.customers.update(existing.id, { ...patch, updatedAt: uow.now }) : existing
    return { customer, created: false }
  }

  // No match means neither the phone nor the email is in use yet.
  const customer = uow.customers.insert({
    id: createId("cus"),
    code: nextCode(uow, "customer"),
    fullName,
    phone,
    email: email ?? undefined,
    city: contact.city?.trim() || undefined,
    preferredContact: contact.preferredContact ?? "whatsapp",
    acquisitionSource: source,
    tags: [],
    notes: [],
    createdAt: uow.now,
    updatedAt: uow.now,
  })
  return { customer, created: true }
}
