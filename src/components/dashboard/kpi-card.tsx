import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * One KPI: label, value, change against the previous period, and a short subtext.
 * `higherIsBetter` decides whether an increase reads as good (green) or bad (red).
 */
export function KpiCard({
  label,
  value,
  change,
  changeLabel,
  higherIsBetter = true,
  hint,
  href,
  badge,
}: {
  label: string
  value: ReactNode
  change?: number | null
  changeLabel?: string
  higherIsBetter?: boolean
  hint?: ReactNode
  href?: string
  badge?: ReactNode
}) {
  const direction = change == null || Math.abs(change) < 0.005 ? "flat" : change > 0 ? "up" : "down"
  const good = direction === "flat" ? null : (direction === "up") === higherIsBetter
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.8125rem] font-medium text-muted-foreground">{label}</p>
        {badge}
      </div>
      <p className="mt-2 text-kpi font-semibold text-text-strong tabular-nums">{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {change !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold tabular-nums",
              good === null ? "bg-tone-neutral-bg text-tone-neutral" : good ? "bg-tone-success-bg text-tone-success" : "bg-tone-danger-bg text-tone-danger",
            )}
          >
            <Icon className="size-3" aria-hidden="true" />
            {change === null ? "Baru" : formatPercent(Math.abs(change), 0)}
            <span className="sr-only">{direction === "up" ? "naik" : direction === "down" ? "turun" : "tetap"}</span>
          </span>
        )}
        {changeLabel && <span className="text-text-subtle">{changeLabel}</span>}
      </div>
      {hint && <p className="mt-3 border-t border-line pt-3 text-xs text-muted-foreground">{hint}</p>}
    </>
  )
  const className = "block rounded-lg border border-line bg-card p-4 shadow-xs md:p-5"
  return href ? (
    <Link href={href} className={cn(className, "transition-colors hover:border-line-strong/60 focus-visible:ring-2 focus-visible:ring-ring")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}
