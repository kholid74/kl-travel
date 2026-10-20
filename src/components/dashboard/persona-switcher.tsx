"use client"

import { Check, ChevronsUpDown } from "lucide-react"
import { getSeedTeam } from "@/services/catalog-server"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDbStore } from "@/stores/db-store"
import { useUiStore } from "@/stores/ui-store"

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
}

/** "Lihat sebagai": demo replacement for login (CONTEXT.md → Persona). */
export function PersonaSwitcher() {
  const personaId = useUiStore((state) => state.personaId)
  const setPersona = useUiStore((state) => state.setPersona)
  const users = useDbStore((state) => state.db?.users)
  const roles = useDbStore((state) => state.db?.roles)

  const seed = getSeedTeam()
  const list = (users ? Object.values(users) : seed.users).filter((user) => user.status === "active")
  const roleName = (roleId: string) => (roles?.[roleId] ?? seed.roles.find((role) => role.id === roleId))?.name ?? ""
  const current = list.find((user) => user.id === personaId) ?? list[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-10 items-center gap-2.5 rounded-md px-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex size-8 items-center justify-center rounded-full bg-ocean-800 text-xs font-semibold text-white">
          {initials(current.name)}
        </span>
        <span className="hidden flex-col leading-tight md:flex">
          <span className="text-sm font-medium text-foreground">{current.name}</span>
          <span className="text-xs text-muted-foreground">{roleName(current.roleId)}</span>
        </span>
        <ChevronsUpDown className="hidden size-3.5 text-muted-foreground md:block" aria-hidden="true" />
        <span className="sr-only">Ganti persona</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Lihat dashboard sebagai (simulasi, tanpa login)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {list.map((user) => (
          <DropdownMenuItem key={user.id} onSelect={() => setPersona(user.id)} className="gap-2.5 py-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[0.6875rem] font-semibold">
              {initials(user.name)}
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-sm">{user.name}</span>
              <span className="text-xs text-muted-foreground">{roleName(user.roleId)}</span>
            </span>
            {user.id === current.id && <Check className="size-4" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
