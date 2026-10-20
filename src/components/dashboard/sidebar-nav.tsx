"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DASHBOARD_NAV, findNavItem } from "./nav-config"

export function SidebarNav({ pathname, collapsed = false, onNavigate }: { pathname: string; collapsed?: boolean; onNavigate?: () => void }) {
  const active = findNavItem(pathname)?.item.href
  return (
    <nav aria-label="Navigasi dashboard" className="flex flex-col gap-5 px-3 py-4">
      {DASHBOARD_NAV.map((group) => (
        <div key={group.label}>
          <p className={cn("mb-1.5 px-3 text-[0.6875rem] font-semibold tracking-[0.12em] text-ivory-50/50 uppercase", collapsed && "sr-only")}>
            {group.label}
          </p>
          <ul className="grid gap-0.5">
            {group.items.map((item) => {
              const isActive = item.href === active
              const link = (
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex h-9 items-center gap-3 rounded-md px-3 text-sm text-ivory-50/75 outline-none transition-colors hover:bg-ivory-50/8 hover:text-ivory-50 focus-visible:ring-2 focus-visible:ring-lagoon-300",
                    isActive && "bg-ivory-50/12 font-medium text-ivory-50",
                    collapsed && "justify-center px-0",
                  )}
                >
                  {isActive && <span aria-hidden="true" className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-lagoon-300" />}
                  <item.icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span className={cn(collapsed && "sr-only")}>{item.label}</span>
                </Link>
              )
              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
