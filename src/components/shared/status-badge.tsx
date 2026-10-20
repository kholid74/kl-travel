import { cn } from "@/lib/utils"
import { TRIP_TYPE_LABEL } from "@/domain/labels"
import type { TripType } from "@/domain/types/common"

export type Tone = "neutral" | "info" | "warning" | "success" | "danger" | "accent"

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-tone-neutral-bg text-tone-neutral",
  info: "bg-tone-info-bg text-tone-info",
  warning: "bg-tone-warning-bg text-tone-warning",
  success: "bg-tone-success-bg text-tone-success",
  danger: "bg-tone-danger-bg text-tone-danger",
  accent: "bg-tone-accent-bg text-tone-accent",
}

/** Status pill: tinted background, dark text and a dot, so meaning never rests on colour alone. */
export function StatusBadge({
  tone,
  children,
  dot = true,
  className,
}: {
  tone: Tone
  children: React.ReactNode
  dot?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {dot && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

const TRIP_TONE: Record<TripType, Tone> = { open: "info", private: "success", custom: "accent" }

export function TripTypeBadge({ type, className }: { type: TripType; className?: string }) {
  return (
    <StatusBadge tone={TRIP_TONE[type]} dot={false} className={className}>
      {TRIP_TYPE_LABEL[type]}
    </StatusBadge>
  )
}
