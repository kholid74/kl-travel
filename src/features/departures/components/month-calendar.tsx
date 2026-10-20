"use client"

import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { addDays, diffDays } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { DepartureRow } from "@/services/queries/departures"

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]

const CHIP: Record<string, string> = {
  open: "border-tone-success/30 bg-tone-success-bg text-tone-success",
  limited: "border-tone-warning/30 bg-tone-warning-bg text-tone-warning",
  full: "border-tone-danger/30 bg-tone-danger-bg text-tone-danger",
  closed: "border-line bg-tone-neutral-bg text-tone-neutral",
  departed: "border-tone-info/30 bg-tone-info-bg text-tone-info",
  completed: "border-line bg-canvas text-text-subtle",
  cancelled: "border-line bg-canvas text-text-subtle line-through",
  // A private departure is always "full" (capacity = its group), which is not a warning.
  private: "border-tone-accent/30 bg-tone-accent-bg text-tone-accent",
}

/** Month grid with each departure on its start day (Monday-first, WIB dates). */
export function MonthCalendar({ month, today, rows, onMonthChange }: { month: string; today: string; rows: DepartureRow[]; onMonthChange: (month: string) => void }) {
  const first = `${month}-01`
  const weekday = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7
  const gridStart = addDays(first, -weekday)
  const nextMonth = addDays(first, 32).slice(0, 7)
  const prevMonth = addDays(first, -1).slice(0, 7)
  const weeks = Math.ceil((weekday + diffDays(`${nextMonth}-01`, first)) / 7)
  const byDay = new Map<string, DepartureRow[]>()
  for (const row of rows) {
    const list = byDay.get(row.departure.startDate) ?? []
    list.push(row)
    byDay.set(row.departure.startDate, list)
  }

  return (
    <div className="rounded-lg border border-line bg-card shadow-xs">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-[0.9375rem] font-semibold text-text-strong capitalize">{formatDate(first, "month-year")}</h2>
        <div className="flex gap-1">
          <Button variant="secondary" size="sm" onClick={() => onMonthChange(today.slice(0, 7))}>
            Bulan ini
          </Button>
          <Button variant="secondary" size="icon-sm" onClick={() => onMonthChange(prevMonth)} aria-label="Bulan sebelumnya">
            <ChevronLeft />
          </Button>
          <Button variant="secondary" size="icon-sm" onClick={() => onMonthChange(nextMonth)} aria-label="Bulan berikutnya">
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-7 border-b border-line bg-canvas/70 text-xs font-semibold text-text-muted">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: weeks * 7 }, (_, i) => {
              const date = addDays(gridStart, i)
              const inMonth = date.startsWith(month)
              const items = byDay.get(date) ?? []
              return (
                <div key={date} className={cn("min-h-28 border-r border-b border-line p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0", !inMonth && "bg-canvas/50")}>
                  <p className={cn("mb-1 px-1 text-xs tabular-nums", date === today ? "inline-flex size-6 items-center justify-center rounded-full bg-ocean-800 font-semibold text-white" : inMonth ? "text-text-muted" : "text-text-subtle/60")}>
                    {Number(date.slice(8))}
                  </p>
                  <ul className="space-y-1">
                    {items.map((row) => (
                      <li key={row.departure.id}>
                        <Link
                          href={`/dashboard/departures/${row.departure.id}`}
                          className={cn("block rounded border px-1.5 py-1 text-[0.6875rem] leading-tight outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring", CHIP[row.departure.kind === "private" && !row.departure.cancelledAt ? "private" : row.status])}
                          title={`${row.pkg?.title} · ${row.seats.allocated}/${row.seats.capacity}`}
                        >
                          <span className="block truncate font-semibold">{row.pkg?.title}</span>
                          <span className="block tabular-nums">
                            {row.pkg?.durationDays}H · {row.seats.allocated}/{row.seats.capacity}
                            {row.departure.kind === "private" && " · privat"}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
