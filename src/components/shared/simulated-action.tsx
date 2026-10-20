"use client"

import type { ReactNode } from "react"
import { FlaskConical } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

/**
 * Wraps a button whose real-world effect (WhatsApp, email, payment gateway) is not part
 * of the showcase. Opening it explains what would happen in production instead.
 */
export function SimulatedAction({
  title,
  description,
  production,
  children,
}: {
  title: string
  description: ReactNode
  /** What a production integration would do here. */
  production?: ReactNode
  children: ReactNode
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-sand-800 uppercase">
            <FlaskConical className="size-3.5" aria-hidden="true" /> Aksi simulasi
          </p>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription className="leading-relaxed">{description}</DialogDescription>
        </DialogHeader>
        {production && (
          <div className="rounded-md bg-muted px-3 py-2.5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Di versi produksi</p>
            <p className="mt-1 leading-relaxed">{production}</p>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="default">Mengerti</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
