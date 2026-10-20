"use client"

import type { ReactNode } from "react"
import { Check, Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

/** Pill toggle for filters and multi-select interests. Pressed = filled ocean. */
export function ChipToggle({
  pressed,
  onPressedChange,
  children,
  className,
  disabled,
}: {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  children: ReactNode
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        pressed ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-foreground hover:bg-muted",
        className,
      )}
    >
      {pressed && <Check className="size-3.5" aria-hidden="true" />}
      {children}
    </button>
  )
}

/**
 * Selectable card used inside a radio group or checkbox-like list. Renders a native
 * input so keyboard and screen reader behaviour comes for free.
 */
export function ChoiceCard({
  type,
  name,
  value,
  checked,
  onChange,
  title,
  description,
  aside,
  disabled,
  className,
}: {
  type: "radio" | "checkbox"
  name: string
  value: string
  checked: boolean
  onChange: (checked: boolean) => void
  title: ReactNode
  description?: ReactNode
  aside?: ReactNode
  disabled?: boolean
  className?: string
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-start gap-3 rounded-md border bg-card p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2",
        checked ? "border-primary shadow-[inset_0_0_0_1px_var(--primary)]" : "border-input hover:border-ink-500",
        disabled && "cursor-not-allowed opacity-60 hover:border-input",
        className,
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center border transition-colors",
          type === "radio" ? "rounded-full" : "rounded-[4px]",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card",
        )}
      >
        {checked && (type === "radio" ? <span className="size-1.5 rounded-full bg-current" /> : <Check className="size-3" />)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        {description && <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>}
      </span>
      {aside && <span className="shrink-0 text-right text-sm">{aside}</span>}
    </label>
  )
}

/** − value + control for pax and group size. */
export function QuantityStepper({
  value,
  min,
  max,
  onChange,
  label,
  unit = "orang",
  id,
}: {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  label: string
  unit?: string
  id?: string
}) {
  return (
    <div role="group" aria-label={label} id={id} className="inline-flex h-11 items-center rounded-md border border-input bg-card">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Kurangi ${label.toLowerCase()}`}
        className="flex h-full w-11 cursor-pointer items-center justify-center rounded-l-md text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <output aria-live="polite" className="min-w-24 px-2 text-center text-sm font-semibold tabular-nums">
        {value} {unit}
      </output>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`Tambah ${label.toLowerCase()}`}
        className="flex h-full w-11 cursor-pointer items-center justify-center rounded-r-md text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
