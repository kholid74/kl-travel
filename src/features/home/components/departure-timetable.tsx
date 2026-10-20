"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { formatDate, formatDateRange, formatDuration, formatIDR } from "@/lib/format"
import { cn } from "@/lib/utils"
import { SectionHeading } from "@/components/public/section-heading"
import { EmptyState } from "@/components/shared/states"
import { StatusBadge } from "@/components/shared/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useUpcomingDepartures } from "@/features/packages/hooks/use-public-catalog"

const WEEKDAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

function weekday(date: string) {
  const [y, m, d] = date.split("-").map(Number)
  return WEEKDAY_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

/** Live timetable of the soonest bookable open-trip departures. */
export function DepartureTimetable() {
  const rows = useUpcomingDepartures(6)

  return (
    <section aria-labelledby="keberangkatan-terdekat" className="bg-ocean-950 py-20 text-ivory-50 md:py-28">
      <div className="container-page">
        <SectionHeading
          id="keberangkatan-terdekat"
          tone="dark"
          eyebrow="Jadwal"
          title="Keberangkatan terdekat"
          description="Open trip yang masih bisa dipesan. Sisa kursi dihitung langsung dari booking yang masuk."
          link={{ href: "/paket?jenis=open&urut=terdekat", label: "Semua jadwal" }}
        />

        <div className="mt-12 border-t border-ivory-50/15">
          {rows === null ? (
            <ul aria-busy="true" aria-label="Memuat jadwal">
              {Array.from({ length: 4 }, (_, i) => (
                <li key={i} className="flex items-center gap-6 border-b border-ivory-50/15 py-6">
                  <Skeleton className="h-14 w-14 bg-ivory-50/10" />
                  <Skeleton className="h-5 flex-1 bg-ivory-50/10" />
                </li>
              ))}
            </ul>
          ) : rows.length === 0 ? (
            <EmptyState
              className="text-ivory-50 [&_p]:text-ivory-50"
              title="Belum ada jadwal open trip yang dibuka"
              description="Jadwal baru biasanya diumumkan dua sampai tiga bulan sebelum keberangkatan."
            />
          ) : (
            <ul>
              {rows.map((row) => {
                const { departure, seats, status, pkg, destination } = row
                const [day, month] = formatDate(departure.startDate, "day-month").split(" ")
                return (
                  <li key={departure.id}>
                    <Link
                      href={`/paket/${pkg.slug}?keberangkatan=${departure.code}#jadwal`}
                      className="group grid grid-cols-[auto_1fr_auto] items-center gap-x-5 gap-y-2 border-b border-ivory-50/15 py-5 transition-colors hover:bg-ivory-50/[0.04] md:grid-cols-[88px_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:gap-x-8 md:px-2"
                    >
                      <span className="row-span-2 flex w-14 flex-col items-center text-center md:row-span-1 md:w-auto md:items-start md:text-left">
                        <span aria-hidden="true" className="font-display text-4xl leading-none tabular-nums">
                          {day}
                        </span>
                        <span aria-hidden="true" className="mt-1 text-[0.6875rem] font-semibold tracking-[0.14em] text-sand-300 uppercase">
                          {month} · {weekday(departure.startDate)}
                        </span>
                        <span className="sr-only">{formatDate(departure.startDate, "weekday")}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold group-hover:underline">{pkg.title}</span>
                        <span className="block text-sm text-ivory-50/70">
                          {destination.name} · {formatDuration(pkg.durationDays, pkg.durationNights)} ·{" "}
                          {formatDateRange(departure.startDate, departure.endDate)}
                        </span>
                      </span>
                      <span className="col-start-2 flex flex-wrap items-center gap-2 text-sm md:col-start-auto">
                        <span className={cn("tabular-nums", status === "limited" ? "font-semibold text-sand-300" : "text-ivory-50/85")}>
                          {status === "limited" ? `Sisa ${seats.available} kursi` : `${seats.available} kursi tersedia`}
                        </span>
                        {seats.guaranteed && (
                          <StatusBadge tone="success" className="h-5 px-2 text-[0.6875rem]">
                            Pasti berangkat
                          </StatusBadge>
                        )}
                      </span>
                      <span className="hidden text-right text-sm tabular-nums md:block">
                        <span className="block text-[0.6875rem] tracking-wide text-ivory-50/60 uppercase">per orang</span>
                        <span className="font-semibold">{formatIDR(row.pricePerPax)}</span>
                      </span>
                      <ChevronRight
                        className="row-span-2 size-5 text-ivory-50/60 transition-transform group-hover:translate-x-0.5 md:row-span-1"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
