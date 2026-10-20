"use client"

import { useId, type ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface FieldControlProps {
  id: string
  "aria-invalid": true | undefined
  "aria-describedby": string | undefined
}

/**
 * Label above, help text and error below, wired to the control for screen readers
 * (docs/design-system.md §8). The control is rendered by the child function.
 */
export function Field({
  label,
  description,
  error,
  optional = false,
  className,
  children,
}: {
  label: ReactNode
  description?: ReactNode
  error?: string
  optional?: boolean
  className?: string
  children: (control: FieldControlProps) => ReactNode
}) {
  const id = useId()
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={id} className="leading-snug">
        {label}
        {optional && <span className="font-normal text-muted-foreground">(opsional)</span>}
      </Label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": [descriptionId, errorId].filter(Boolean).join(" ") || undefined,
      })}
      {description && (
        <p id={descriptionId} className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/** Group of related choices (chips, radio cards) with a visible legend. */
export function FieldGroup({
  legend,
  description,
  error,
  className,
  children,
}: {
  legend: ReactNode
  description?: ReactNode
  error?: string
  className?: string
  children: ReactNode
}) {
  const id = useId()
  return (
    <fieldset
      className={cn("grid gap-2.5", className)}
      aria-describedby={[description && `${id}-description`, error && `${id}-error`].filter(Boolean).join(" ") || undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend className="mb-0.5 text-sm leading-snug font-medium">{legend}</legend>
      {description && (
        <p id={`${id}-description`} className="-mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  )
}
