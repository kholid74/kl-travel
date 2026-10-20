"use client"

import Link from "next/link"
import { CalendarClock } from "lucide-react"
import { formatDate, formatDateRange, formatIDR } from "@/lib/format"
import { ChoiceCard } from "@/components/shared/choice"
import { EmptyState } from "@/components/shared/states"
import { StatusBadge } from "@/components/shared/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { DepartureOption } from "@/services/queries/catalog"
import { DEPARTURE_STATUS_TONE, departureSeatLabel } from "../labels"

/** Upcoming departures as a radio list; only open/limited departures can be chosen. */
export function DepartureList({
  options,
  selectedId,
  onSelect,
  packageSlug,
  name = "keberangkatan",
}: {
  options: DepartureOption[] | null
  selectedId: string | null
  onSelect: (departureId: string) => void
  packageSlug: string
  name?: string
}) {
  if (options === null) {
    return (
      <div className="grid gap-3" aria-busy="true" aria-label="Memuat jadwal keberangkatan">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-md" />
        ))}
      </div>
    )
  }
  if (options.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        className="rounded-md border border-dashed border-input"
        title="Jadwal berikutnya segera diumumkan"
        description="Tinggalkan pertanyaan, kami kabari saat jadwal baru dibuka."
        action={
          <Link href={`/kontak?paket=${packageSlug}`} className="text-sm font-semibold text-lagoon-700 underline underline-offset-4">
            Tanyakan jadwal
          </Link>
        }
      />
    )
  }
  return (
    <div role="radiogroup" aria-label="Pilih tanggal keberangkatan" className="grid gap-3">
      {options.map((option) => {
        const { departure } = option
        return (
          <ChoiceCard
            key={departure.id}
            type="radio"
            name={name}
            value={departure.id}
            checked={selectedId === departure.id}
            onChange={() => onSelect(departure.id)}
            disabled={!option.bookable}
            title={
              <>
                {formatDateRange(departure.startDate, departure.endDate)}
                <span className="sr-only">, berangkat {formatDate(departure.startDate, "weekday")}</span>
              </>
            }
            description={
              <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <StatusBadge tone={DEPARTURE_STATUS_TONE[option.status]}>{departureSeatLabel(option)}</StatusBadge>
                {option.seats.guaranteed && option.status !== "closed" && (
                  <StatusBadge tone="info" dot={false}>
                    Pasti berangkat
                  </StatusBadge>
                )}
                {option.status === "closed" && departure.salesClosedReason && (
                  <span className="text-xs text-muted-foreground">{departure.salesClosedReason}</span>
                )}
              </span>
            }
            aside={
              <>
                <span className="block text-[0.6875rem] tracking-wide text-muted-foreground uppercase">per orang</span>
                <span className="font-semibold text-foreground tabular-nums">{formatIDR(option.pricePerPax)}</span>
              </>
            }
          />
        )
      })}
    </div>
  )
}
