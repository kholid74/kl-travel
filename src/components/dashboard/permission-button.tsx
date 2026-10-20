"use client"

import type { ComponentProps } from "react"
import { Lock } from "lucide-react"
import type { Permission } from "@/domain/entities"
import { usePersona } from "@/hooks/use-persona"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * Button that stays visible for every persona but is disabled, with the reason in a
 * tooltip, when the active persona lacks the permission (PermissionGate in the docs).
 */
export function PermissionButton({
  permission,
  children,
  asChild,
  disabledReason,
  type,
  ...props
}: ComponentProps<typeof Button> & { permission: Permission; disabledReason?: string | null }) {
  const { denial } = usePersona()
  const reason = denial(permission) ?? disabledReason ?? null
  if (!reason) {
    // Never submit a surrounding form by accident (sheets are often opened from inside one).
    return (
      <Button asChild={asChild} type={asChild ? undefined : (type ?? "button")} {...props}>
        {children}
      </Button>
    )
  }
  // Disabled buttons do not fire pointer events, so the tooltip hangs on a focusable wrapper.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={reason}>
          <Button {...props} type="button" disabled aria-disabled="true">
            {denial(permission) && <Lock aria-hidden="true" />}
            {asChild ? <span>{getLabel(children)}</span> : children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  )
}

/** Text of an asChild link, so a disabled copy can show the same label without the link. */
function getLabel(children: React.ReactNode): React.ReactNode {
  if (children && typeof children === "object" && "props" in children) {
    return (children as React.ReactElement<{ children?: React.ReactNode }>).props.children
  }
  return children
}
