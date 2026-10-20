"use client"

import Link from "next/link"
import { useMemo } from "react"
import { ArrowRight } from "lucide-react"
import type { TourPackage } from "@/domain/entities"
import { startingPrice } from "@/domain/rules/pricing"
import { formatDuration, formatIDR } from "@/lib/format"
import { AvailabilityText, PackageCard } from "@/components/public/package-card"
import { Reveal } from "@/components/public/motion"
import { SectionHeading } from "@/components/public/section-heading"
import { SmartImage } from "@/components/shared/smart-image"
import { usePublicContent } from "@/features/content/hooks/use-public-content"
import { availabilityLine } from "@/features/packages/availability"
import { useAvailabilityMap, usePublicCatalog } from "@/features/packages/hooks/use-public-catalog"
import type { PublicCatalog, PublicContent } from "@/services/queries/catalog"

/** Featured open trips: one editorial feature plus a row of cards. */
export function FeaturedTrips({ initialContent, initialCatalog }: { initialContent: PublicContent; initialCatalog: PublicCatalog }) {
  const { siteContent } = usePublicContent(initialContent)
  const { packages, destinations } = usePublicCatalog(initialCatalog)

  const featured = useMemo(() => {
    const byId = new Map(packages.map((p) => [p.id, p]))
    const picked = siteContent.featuredPackageIds.map((id) => byId.get(id)).filter((p): p is TourPackage => p?.tripType === "open")
    // Keep the section full when the editor features fewer open trips.
    const rest = packages.filter((p) => p.tripType === "open" && !picked.includes(p))
    return [...picked, ...rest].slice(0, 5)
  }, [packages, siteContent.featuredPackageIds])

  const availability = useAvailabilityMap(featured.map((p) => p.id))
  const destinationName = (id: string) => destinations.find((d) => d.id === id)?.name ?? ""
  const line = (pkg: TourPackage) => availabilityLine(pkg, availability ? availability.get(pkg.id) : null)
  const [lead, ...others] = featured
  if (!lead) return null
  const leadPrice = startingPrice(lead)

  return (
    <section aria-labelledby="open-trip-pilihan" className="border-t border-border bg-ivory-100/60 py-20 md:py-28">
      <div className="container-page">
        <SectionHeading
          id="open-trip-pilihan"
          eyebrow="Open trip pilihan"
          title="Bergabung dengan grup kecil, berangkat di jadwal yang pasti"
          link={{ href: "/paket?jenis=open", label: "Semua open trip" }}
        />

        <Reveal className="mt-12">
          <article className="group relative grid overflow-hidden rounded-[4px] bg-card md:grid-cols-12">
            <div className="relative aspect-[4/3] md:col-span-7 md:aspect-auto md:min-h-[460px]">
              <SmartImage
                mediaId={lead.coverMediaId}
                fill
                sizes="(min-width: 768px) 58vw, 100vw"
                className="transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.03]"
              />
            </div>
            <div className="flex flex-col justify-between gap-8 p-6 md:col-span-5 md:p-10">
              <div>
                <p className="eyebrow text-lagoon-700">
                  {destinationName(lead.destinationId)} · {formatDuration(lead.durationDays, lead.durationNights, "long")}
                </p>
                <h3 className="mt-3 font-display text-4xl leading-[1.05] text-balance text-ocean-900 md:text-5xl">
                  <Link href={`/paket/${lead.slug}`} className="outline-none after:absolute after:inset-0 focus-visible:underline">
                    {lead.title}
                  </Link>
                </h3>
                <p className="mt-4 text-pretty text-muted-foreground">{lead.summary}</p>
                <ul className="mt-6 space-y-2 text-sm text-foreground">
                  {lead.highlights.slice(0, 3).map((h) => (
                    <li key={h} className="flex gap-2.5">
                      <span aria-hidden="true" className="mt-2 h-px w-4 shrink-0 bg-sand-500" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border pt-5">
                <div>
                  {leadPrice !== null && (
                    <p className="text-sm text-muted-foreground">
                      Mulai dari <span className="block text-2xl font-semibold text-foreground tabular-nums">{formatIDR(leadPrice)}</span>
                    </p>
                  )}
                  <AvailabilityText line={line(lead)} />
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean-900">
                  Lihat jadwal <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </div>
            </div>
          </article>
        </Reveal>

        <ul className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-4">
          {others.map((pkg, index) => (
            <li key={pkg.id}>
              <Reveal delay={index * 0.06}>
                <PackageCard
                  pkg={pkg}
                  destinationName={destinationName(pkg.destinationId)}
                  availability={line(pkg)}
                  sizes="(min-width: 1280px) 300px, (min-width: 640px) 50vw, 100vw"
                />
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
