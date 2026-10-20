"use client"

import Link from "next/link"
import { ArrowRight, CalendarDays, Info } from "lucide-react"
import type { TourPackage } from "@/domain/entities"
import { startingPrice, tierFor } from "@/domain/rules/pricing"
import { formatDateRange, formatIDR } from "@/lib/format"
import { cn } from "@/lib/utils"
import { QuantityStepper } from "@/components/shared/choice"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { DepartureOption, PackageAvailability } from "@/services/queries/catalog"
import { departureSeatLabel } from "../labels"

export interface BookingSelection {
  pkg: TourPackage
  availability: PackageAvailability | null
  selected: DepartureOption | null
  pax: number
  onPaxChange: (pax: number) => void
  maxPaxPerBooking: number
}

/** Upper bound for the pax stepper: seats left (open) or the package's group size (private). */
export function paxLimits({ pkg, selected, maxPaxPerBooking }: Pick<BookingSelection, "pkg" | "selected" | "maxPaxPerBooking">) {
  if (pkg.tripType === "open") return { min: 1, max: Math.max(1, Math.min(selected?.seats.available ?? 1, maxPaxPerBooking)) }
  return { min: pkg.groupSize.min, max: pkg.groupSize.max }
}

/** Per-person price for the current selection: the departure price, or the private tier. */
export function selectionPrice({ pkg, selected, pax }: Pick<BookingSelection, "pkg" | "selected" | "pax">): number | null {
  if (pkg.tripType === "open") return selected?.pricePerPax ?? startingPrice(pkg)
  if (pkg.pricing.kind === "tiered") return tierFor(pkg.pricing.tiers, pax)?.pricePerPax ?? null
  return startingPrice(pkg)
}

export function bookingHref({ pkg, selected, pax }: Pick<BookingSelection, "pkg" | "selected" | "pax">): string | null {
  if (pkg.tripType === "open") return selected ? `/paket/${pkg.slug}/pesan?keberangkatan=${selected.departure.code}&peserta=${pax}` : null
  return `/paket/${pkg.slug}/ajukan?peserta=${pax}`
}

/** Sticky desktop panel next to the package content. */
export function BookingPanel(props: BookingSelection & { className?: string }) {
  const { pkg, availability, selected, pax, onPaxChange, className } = props
  const open = pkg.tripType === "open"
  const price = selectionPrice(props)
  const limits = paxLimits(props)
  const href = bookingHref(props)
  const loading = open && availability === null
  const noDates = open && availability !== null && !availability.next

  return (
    <div className={cn("rounded-[4px] border border-border bg-card p-6 shadow-[0_18px_50px_-24px_rgb(7_26_43/0.35)]", className)}>
      <p className="text-sm text-muted-foreground">{open && selected ? "Harga per orang" : "Mulai dari"}</p>
      <p className="mt-0.5 text-3xl font-semibold text-ocean-900 tabular-nums">{price !== null ? formatIDR(price) : "Sesuai penawaran"}</p>

      {open ? (
        <div className="mt-6 space-y-5">
          {loading ? (
            <Skeleton className="h-[68px] rounded-md" />
          ) : selected ? (
            <div className="flex items-start justify-between gap-3 rounded-md bg-muted px-4 py-3">
              <div className="flex gap-3">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-lagoon-700" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{formatDateRange(selected.departure.startDate, selected.departure.endDate)}</p>
                  <p className={cn("text-xs", selected.status === "limited" ? "font-semibold text-tone-warning" : "text-muted-foreground")}>
                    {departureSeatLabel(selected)}
                  </p>
                </div>
              </div>
              <a href="#jadwal" className="shrink-0 text-xs font-semibold text-lagoon-700 underline underline-offset-4">
                Ganti
              </a>
            </div>
          ) : (
            <p className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
              {noDates ? "Belum ada jadwal yang bisa dipesan." : "Pilih tanggal keberangkatan di bagian Jadwal."}
            </p>
          )}

          {selected && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">Peserta</span>
              <QuantityStepper value={pax} min={limits.min} max={limits.max} onChange={onPaxChange} label="Jumlah peserta" />
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">Ukuran grup</span>
            <QuantityStepper value={pax} min={limits.min} max={limits.max} onChange={onPaxChange} label="Ukuran grup" />
          </div>
          {pkg.pricing.kind === "tiered" && pkg.pricing.tiers.length > 1 && (
            <table className="w-full text-sm">
              <caption className="sr-only">Harga per orang menurut ukuran grup</caption>
              <tbody>
                {pkg.pricing.tiers.map((tier) => {
                  const active = pax >= tier.minPax && pax <= tier.maxPax
                  return (
                    <tr key={tier.minPax} className={cn("border-b border-border last:border-0", active && "font-semibold text-foreground")}>
                      <th scope="row" className={cn("py-1.5 text-left font-normal", active ? "text-foreground" : "text-muted-foreground")}>
                        {tier.minPax === tier.maxPax ? `${tier.minPax} orang` : `${tier.minPax}–${tier.maxPax} orang`}
                      </th>
                      <td className="py-1.5 text-right tabular-nums">{formatIDR(tier.pricePerPax)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {price !== null && (!open || selected) && (
        <div className="mt-5 flex items-baseline justify-between border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">{open ? "Total" : "Estimasi total"}</span>
          <span className="text-lg font-semibold tabular-nums">{formatIDR(price * pax)}</span>
        </div>
      )}

      <div className="mt-5 grid gap-3">
        {href ? (
          <Button asChild size="xl" className="w-full">
            <Link href={href}>
              {open ? "Lanjut ke pemesanan" : "Ajukan tanggal & grup"} <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        ) : noDates ? (
          <Button asChild size="xl" variant="secondary" className="w-full">
            <Link href={`/kontak?paket=${pkg.slug}`}>Tanyakan jadwal berikutnya</Link>
          </Button>
        ) : (
          <Button asChild size="xl" className="w-full">
            <a href="#jadwal">Pilih jadwal</a>
          </Button>
        )}
        {!open && pkg.isCustomizable && (
          <Link href={`/custom-trip?dari=${pkg.slug}`} className="text-center text-sm font-semibold text-lagoon-700 underline-offset-4 hover:underline">
            Ingin mengubah itinerary? Jadikan custom trip
          </Link>
        )}
      </div>

      <p className="mt-5 flex gap-2 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        {open
          ? "Belum ada pembayaran di langkah ini. Kursi ditahan 24 jam setelah pemesanan dikirim, sambil tim kami memverifikasi."
          : "Belum ada pembayaran. Tim kami mengecek ketersediaan lalu mengirim penawaran berisi harga final."}
      </p>
    </div>
  )
}

/** Bottom CTA bar on phones and tablets; marks the page so the demo button moves up. */
export function MobileBookingBar(props: BookingSelection) {
  const { pkg, selected } = props
  const open = pkg.tripType === "open"
  const price = selectionPrice(props)
  const href = bookingHref(props)
  return (
    <div
      data-mobile-cta=""
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="container-page flex h-[72px] items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">
            {open && selected ? formatDateRange(selected.departure.startDate, selected.departure.endDate) : "Mulai dari"}
          </p>
          <p className="text-lg font-semibold text-ocean-900 tabular-nums">
            {price !== null ? formatIDR(price) : "Sesuai penawaran"}
            <span className="text-xs font-normal text-muted-foreground"> /orang</span>
          </p>
        </div>
        {href ? (
          <Button asChild size="lg">
            <Link href={href}>{open ? "Pesan" : "Ajukan tanggal"}</Link>
          </Button>
        ) : (
          <Button asChild size="lg">
            <a href="#jadwal">Pilih jadwal</a>
          </Button>
        )}
      </div>
    </div>
  )
}
