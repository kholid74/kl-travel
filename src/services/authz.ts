import { DomainError } from "@/lib/result"
import type { Permission, User } from "@/domain/entities"
import { PERMISSION_LABEL } from "@/domain/labels"
import type { Actor, ID } from "@/domain/types/common"
import type { UnitOfWork } from "@/repositories"

export const userActor = (userId: ID): Actor => ({ kind: "user", userId })

/**
 * The persona chosen in "Lihat sebagai" must hold `permission`. Checked inside the
 * transaction, so the rule holds even if a button was enabled by mistake.
 */
export function requirePermission(uow: UnitOfWork, userId: ID, permission: Permission): User {
  const user = uow.users.get(userId)
  if (!user || user.status !== "active") throw new DomainError("PERMISSION_DENIED", "Persona tidak aktif. Pilih persona lain.")
  const role = uow.roles.get(user.roleId)
  if (!role?.permissions.includes(permission)) {
    throw new DomainError("PERMISSION_DENIED", `Peran ${role?.name ?? "ini"} tidak memiliki izin untuk ${PERMISSION_LABEL[permission]}.`)
  }
  return user
}
