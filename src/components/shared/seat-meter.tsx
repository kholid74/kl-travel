import { cn } from "@/lib/utils"
import type { SeatSummary } from "@/domain/rules/availability"

/** Bar of confirmed · held · available seats, with the numbers spelled out for screen readers. */
export function SeatMeter({
  seats,
  showLegend = true,
  className,
}: {
  seats: Pick<SeatSummary, "capacity" | "allocated" | "held" | "available">
  showLegend?: boolean
  className?: string
}) {
  const pct = (value: number) => (seats.capacity > 0 ? (value / seats.capacity) * 100 : 0)
  const label = `${seats.allocated} terkonfirmasi, ${seats.held} ditahan, ${seats.available} tersedia dari ${seats.capacity} kursi`
  return (
    <div className={cn("w-full", className)}>
      <div role="img" aria-label={label} className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <span className="h-full bg-ocean-800" style={{ width: `${pct(seats.allocated)}%` }} />
        <span className="h-full bg-sand-500" style={{ width: `${pct(seats.held)}%` }} />
      </div>
      {showLegend && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true" className="size-2 rounded-full bg-ocean-800" />
            {seats.allocated} terkonfirmasi
          </span>
          {seats.held > 0 && (
            <span className="inline-flex items-center gap-1">
              <span aria-hidden="true" className="size-2 rounded-full bg-sand-500" />
              {seats.held} ditahan
            </span>
          )}
          <span>{seats.available} sisa</span>
        </div>
      )}
    </div>
  )
}
