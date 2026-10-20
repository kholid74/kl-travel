"use client"

import type { ComponentProps } from "react"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

/** Rupiah amount typed with thousand separators; the value is a whole number (0 = empty). */
export function MoneyInput({
  value,
  onChange,
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> & { value: number; onChange: (value: number) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
      <Input
        {...props}
        inputMode="numeric"
        className={cn("pl-9 tabular-nums", className)}
        value={value ? formatNumber(value) : ""}
        onChange={(event) => onChange(Number(event.target.value.replace(/\D/g, "")) || 0)}
      />
    </div>
  )
}
