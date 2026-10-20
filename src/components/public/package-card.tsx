import Link from "next/link"
import { CalendarDays } from "lucide-react"
import type { TourPackage } from "@/domain/entities"
import { startingPrice } from "@/domain/rules/pricing"
import { formatDuration, formatIDR } from "@/lib/format"
import { cn } from "@/lib/utils"
import { SmartImage } from "@/components/shared/smart-image"
import { TripTypeBadge } from "@/components/shared/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { AvailabilityLine } from "@/features/packages/availability"

/**
 * Package card: 4:3 photo, destination · duration, title, "mulai dari" price, and one
 * availability line. The whole card is one link (docs/design-system.md §8).
 */
export function PackageCard({
  pkg,
  destinationName,
  availability,
  sizes = "(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw",
  layout = "stacked",
  className,
}: {
  pkg: TourPackage
  destinationName: string
  /** null while live seats load; omitted when not shown. */
  availability?: AvailabilityLine | null
  sizes?: string
  layout?: "stacked" | "row"
  className?: string
}) {
  const price = startingPrice(pkg)
  const row = layout === "row"
  return (
    <article className={cn("group relative", row && "grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-5 sm:gap-6", className)}>
      <div className={cn("relative overflow-hidden rounded-[2px] bg-muted", row ? "aspect-[4/3] self-start" : "aspect-[4/3]")}>
        <SmartImage
          mediaId={pkg.coverMediaId}
          fill
          sizes={sizes}
          className="transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
        />
        {pkg.tripType !== "open" && <TripTypeBadge type={pkg.tripType} className="absolute top-3 left-3 shadow-sm" />}
      </div>
      <div className={cn(row ? "py-1" : "pt-4")}>
        <p className="eyebrow text-muted-foreground">
          {destinationName} · {formatDuration(pkg.durationDays, pkg.durationNights)}
        </p>
        <h3 className={cn("mt-1.5 font-semibold text-balance text-ocean-900", row ? "text-lg leading-snug" : "text-lg leading-snug")}>
          <Link href={`/paket/${pkg.slug}`} className="outline-none after:absolute after:inset-0 focus-visible:underline">
            {pkg.title}
          </Link>
        </h3>
        {row && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{pkg.summary}</p>}
        <p className="mt-3 text-sm text-muted-foreground">
          {price !== null ? (
            <>
              Mulai dari <span className="text-base font-semibold text-foreground tabular-nums">{formatIDR(price)}</span>
              <span className="text-muted-foreground"> /orang</span>
            </>
          ) : (
            "Harga sesuai penawaran"
          )}
        </p>
        {availability !== undefined && <AvailabilityText line={availability} />}
      </div>
    </article>
  )
}

export function AvailabilityText({ line, className }: { line: AvailabilityLine | null; className?: string }) {
  if (!line) return <Skeleton className={cn("mt-2 h-4 w-44 rounded-sm", className)} />
  return (
    <p
      className={cn(
        "mt-2 flex items-center gap-1.5 text-[0.8125rem]",
        line.tone === "warning" ? "font-medium text-tone-warning" : line.tone === "muted" ? "text-muted-foreground" : "text-foreground",
        className,
      )}
    >
      <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
      {line.text}
    </p>
  )
}
