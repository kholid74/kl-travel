import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface LegendItem {
  label: string
  color: string
  shape?: "bar" | "line"
}

/** Legend for two or more series; identity is never carried by color alone. */
export function ChartLegend({ items, className }: { items: LegendItem[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted", className)}>
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={item.shape === "line" ? "h-0.5 w-3.5 rounded-full" : "size-2.5 rounded-[3px]"} style={{ backgroundColor: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

/**
 * Chart with its text summary and an alternative table (requirement §6.10). The plot is
 * hidden from assistive tech; the summary and the table carry the same numbers.
 */
export function ChartFrame({
  summary,
  legend,
  table,
  tableLabel = "Lihat sebagai tabel",
  children,
  className,
}: {
  summary: ReactNode
  legend?: LegendItem[]
  table: ReactNode
  tableLabel?: string
  children: ReactNode
  className?: string
}) {
  return (
    <figure className={cn("grid gap-3", className)}>
      {legend && legend.length > 1 && <ChartLegend items={legend} />}
      <div aria-hidden="true">{children}</div>
      <figcaption className="text-sm leading-relaxed text-text-muted">{summary}</figcaption>
      <details className="group rounded-md border border-line">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-xs font-semibold text-text-muted outline-none select-none hover:text-text-strong focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
          {tableLabel}
        </summary>
        <div className="overflow-x-auto border-t border-line">{table}</div>
      </details>
    </figure>
  )
}

/** Compact table used inside ChartFrame. */
export function ChartTable({ head, rows, align }: { head: string[]; rows: ReactNode[][]; align?: ("left" | "right")[] }) {
  return (
    <table className="w-full text-xs">
      <thead className="bg-canvas/70">
        <tr className="border-b border-line text-left text-text-muted">
          {head.map((h, i) => (
            <th key={h} scope="col" className={cn("px-3 py-2 font-semibold whitespace-nowrap", align?.[i] === "right" && "text-right")}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r} className="border-b border-line last:border-0">
            {row.map((cell, i) => (
              <td key={i} className={cn("px-3 py-1.5", align?.[i] === "right" && "text-right tabular-nums")}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
