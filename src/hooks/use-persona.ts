"use client"

import { useMemo } from "react"
import type { Permission, Role, User } from "@/domain/entities"
import { PERMISSION_LABEL } from "@/domain/labels"
import { useDbStore } from "@/stores/db-store"
import { useUiStore } from "@/stores/ui-store"

export interface Persona {
  user: User | null
  role: Role | null
  can: (permission: Permission) => boolean
  /** Tooltip text for a disabled action, or null when allowed. */
  denial: (permission: Permission) => string | null
}

/** The team member chosen in "Lihat sebagai" and what their role may do. */
export function usePersona(): Persona {
  const personaId = useUiStore((state) => state.personaId)
  const users = useDbStore((state) => state.db?.users)
  const roles = useDbStore((state) => state.db?.roles)
  return useMemo(() => {
    const user = users?.[personaId] ?? null
    const role = user && roles ? (roles[user.roleId] ?? null) : null
    const can = (permission: Permission) => !!role?.permissions.includes(permission)
    return {
      user,
      role,
      can,
      denial: (permission) => (can(permission) ? null : `Peran ${role?.name ?? "ini"} tidak memiliki izin untuk ${PERMISSION_LABEL[permission]}.`),
    }
  }, [personaId, users, roles])
}
