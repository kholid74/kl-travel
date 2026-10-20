import { createId } from "@/lib/ids"
import { DomainError } from "@/lib/result"
import type { Permission, User } from "@/domain/entities"
import { PERMISSION_LABEL } from "@/domain/labels"
import type { ID } from "@/domain/types/common"
import type { UnitOfWork } from "@/repositories"
import { logActivity } from "./activity-log"
import { requirePermission, userActor } from "./authz"
import { runCommand } from "./runtime"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The owner role always keeps every permission, so nobody can lock the team out. */
function requireEditableRole(uow: UnitOfWork, roleId: ID) {
  const role = uow.roles.require(roleId)
  if (role.key === "owner") throw new DomainError("INVALID_TRANSITION", "Izin peran Owner tidak dapat diubah.")
  return role
}

function activeOwners(uow: UnitOfWork) {
  const ownerRoles = new Set(uow.roles.find((r) => r.key === "owner").map((r) => r.id))
  return uow.users.find((u) => u.status === "active" && ownerRoles.has(u.roleId))
}

export interface InviteInput {
  name: string
  email: string
  title: string
  roleId: ID
}

/** Adds a teammate as "invited". No email is sent in the demo. */
export function inviteMember(uow: UnitOfWork, userId: ID, input: InviteInput): User {
  requirePermission(uow, userId, "team.manage")
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  if (name.length < 3) throw new DomainError("VALIDATION", "Nama minimal 3 karakter.", "name")
  if (!EMAIL.test(email)) throw new DomainError("VALIDATION", "Format email tidak valid.", "email")
  if (uow.users.find((u) => u.email.toLowerCase() === email).length) throw new DomainError("CONFLICT", "Email sudah terdaftar di tim.", "email")
  const role = uow.roles.require(input.roleId)
  const user = uow.users.insert({
    id: createId("usr"),
    name,
    email,
    title: input.title.trim() || role.name,
    roleId: role.id,
    status: "invited",
    createdAt: uow.now,
    updatedAt: uow.now,
  })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "user", id: user.id },
    action: "team.invited",
    message: `${name} diundang sebagai ${role.name} (simulasi, tanpa email)`,
  })
  return user
}

export function changeMemberRole(uow: UnitOfWork, userId: ID, memberId: ID, roleId: ID): User {
  requirePermission(uow, userId, "team.manage")
  const member = uow.users.require(memberId)
  const role = uow.roles.require(roleId)
  if (member.roleId === role.id) return member
  const wasOwner = uow.roles.get(member.roleId)?.key === "owner"
  if (wasOwner && member.status === "active" && activeOwners(uow).length === 1) {
    throw new DomainError("INVALID_TRANSITION", "Tim harus memiliki minimal satu Owner aktif.")
  }
  const updated = uow.users.update(member.id, { roleId: role.id, updatedAt: uow.now })
  logActivity(uow, { actor: userActor(userId), subject: { type: "user", id: member.id }, action: "team.role_changed", message: `Peran ${member.name} diubah menjadi ${role.name}` })
  return updated
}

/**
 * invited → active (simulates the invitation being accepted), active ↔ inactive.
 * The persona in use and the last active owner cannot be deactivated.
 */
export function setMemberStatus(uow: UnitOfWork, userId: ID, memberId: ID, status: "active" | "inactive"): User {
  requirePermission(uow, userId, "team.manage")
  const member = uow.users.require(memberId)
  if (member.status === status) return member
  if (status === "inactive") {
    if (member.id === userId) throw new DomainError("INVALID_TRANSITION", "Persona yang sedang dipakai tidak dapat dinonaktifkan.")
    if (uow.roles.get(member.roleId)?.key === "owner" && activeOwners(uow).length === 1) {
      throw new DomainError("INVALID_TRANSITION", "Tim harus memiliki minimal satu Owner aktif.")
    }
  }
  const updated = uow.users.update(member.id, { status, updatedAt: uow.now })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "user", id: member.id },
    action: status === "active" ? "team.activated" : "team.deactivated",
    message: status === "active" ? (member.status === "invited" ? `${member.name} menerima undangan (simulasi)` : `${member.name} diaktifkan kembali`) : `${member.name} dinonaktifkan`,
  })
  return updated
}

/** Grants or revokes one permission for a non-owner role. Takes effect on the next action. */
export function setRolePermission(uow: UnitOfWork, userId: ID, roleId: ID, permission: Permission, granted: boolean) {
  requirePermission(uow, userId, "team.manage")
  const role = requireEditableRole(uow, roleId)
  const has = role.permissions.includes(permission)
  if (has === granted) return role
  const permissions = granted ? [...role.permissions, permission] : role.permissions.filter((p) => p !== permission)
  const updated = uow.roles.update(role.id, { permissions })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "user", id: userId },
    action: "team.permission_changed",
    message: `Peran ${role.name} ${granted ? "mendapat" : "kehilangan"} izin ${PERMISSION_LABEL[permission]}`,
  })
  return updated
}

export const teamCommands = {
  invite: (userId: ID, input: InviteInput) => runCommand((uow) => inviteMember(uow, userId, input)),
  changeRole: (userId: ID, memberId: ID, roleId: ID) => runCommand((uow) => changeMemberRole(uow, userId, memberId, roleId)),
  setStatus: (userId: ID, memberId: ID, status: "active" | "inactive") => runCommand((uow) => setMemberStatus(uow, userId, memberId, status)),
  setPermission: (userId: ID, roleId: ID, permission: Permission, granted: boolean) =>
    runCommand((uow) => setRolePermission(uow, userId, roleId, permission, granted)),
}
