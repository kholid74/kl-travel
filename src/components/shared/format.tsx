import type { DateOnly } from "@/lib/dates"
import { formatDate, formatDateRange, formatDuration, formatIDR, formatIDRCompact, type DateStyle } from "@/lib/format"
import { cn } from "@/lib/utils"

export function Money({ value, compact = false, className }: { value: number; compact?: boolean; className?: string }) {
  return <span className={cn("tabular-nums", className)}>{compact ? formatIDRCompact(value) : formatIDR(value)}</span>
}

export function DateText({ value, style = "short", className }: { value: DateOnly; style?: DateStyle; className?: string }) {
  return (
    <time dateTime={value} className={className}>
      {formatDate(value, style)}
    </time>
  )
}

export function DateRangeText({ start, end, className }: { start: DateOnly; end: DateOnly; className?: string }) {
  return (
    <time dateTime={start} className={className}>
      {formatDateRange(start, end)}
    </time>
  )
}

export function DurationText({ days, nights, long = false }: { days: number; nights: number; long?: boolean }) {
  return <span>{formatDuration(days, nights, long ? "long" : "short")}</span>
}
