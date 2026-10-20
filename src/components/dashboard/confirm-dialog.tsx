"use client"

import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/**
 * Confirmation for consequential actions, with the impact spelled out before the user
 * commits (cancellation fees, bookings affected). Children can hold extra fields.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  tone = "default",
  pending = false,
  confirmDisabled = false,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  children?: ReactNode
  confirmLabel: string
  tone?: "default" | "destructive"
  pending?: boolean
  confirmDisabled?: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(value) => !pending && onOpenChange(value)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          {description && <DialogDescription className="leading-relaxed">{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Batal
          </Button>
          <Button variant={tone === "destructive" ? "destructive" : "default"} onClick={onConfirm} disabled={pending || confirmDisabled}>
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
