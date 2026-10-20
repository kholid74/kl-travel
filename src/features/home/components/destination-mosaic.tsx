"use client"

import Link from "next/link"
import { useMemo } from "react"
import { ArrowUpRight } from "lucide-react"
import { REGION_LABEL } from "@/domain/labels"
import type { Destination } from "@/domain/entities"
import { cn } from "@/lib/utils"
import { Reveal } from "@/components/public/motion"
import { SectionHeading } from "@/components/public/section-heading"
import { SmartImage } from "@/components/shared/smart-image"
import { usePublicContent } from "@/features/content/hooks/use-public-content"
import { usePublicCatalog } from "@/features/packages/hooks/use-public-catalog"
import type { PublicCatalog, PublicContent } from "@/services/queries/catalog"

// Asymmetric editorial grid: one tall feature, two stacked, then a reversed pair.
const TILE_LAYOUT = [
  "aspect-[4/5] sm:col-span-2 sm:aspect-[16/10] md:col-span-7 md:row-span-2 md:aspect-auto",
  "aspect-[4/3] md:col-span-5",
  "aspect-[4/3] md:col-span-5",
  "aspect-[4/3] md:col-span-5 md:aspect-[5/4]",
  "aspect-[4/3] sm:col-span-2 sm:aspect-[16/10] md:col-span-7 md:aspect-auto",
]

export function DestinationMosaic({ initialContent, initialCatalog }: { initialContent: PublicContent; initialCatalog: PublicCatalog }) {
  const { siteContent } = usePublicContent(initialContent)
  const { destinations, packages } = usePublicCatalog(initialCatalog)

  const tiles = useMemo(() => {
    const byId = new Map(destinations.map((d) => [d.id, d]))
    return siteContent.featuredDestinationIds
      .map((id) => byId.get(id))
      .filter((d): d is Destination => !!d)
      .slice(0, 5)
      .map((destination) => ({
        destination,
        packageCount: packages.filter((p) => p.destinationId === destination.id).length,
        // Never repeat the hero photo directly below it.
        mediaId:
          destination.coverMediaId === siteContent.hero.mediaId
            ? (destination.galleryMediaIds[0] ?? destination.coverMediaId)
            : destination.coverMediaId,
      }))
  }, [destinations, packages, siteContent])

  return (
    <section aria-labelledby="destinasi-unggulan" className="container-page py-20 md:py-28">
      <SectionHeading
        id="destinasi-unggulan"
        eyebrow="Destinasi"
        title="Dari savana Komodo hingga karst Raja Ampat"
        description="Kami mengenal baik setiap destinasi: kapan musim terbaiknya, bagaimana cara menjelajahnya, dan mitra lokal mana yang akan menyambut Anda."
        link={{ href: "/destinasi", label: "Semua destinasi" }}
      />
      <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-12 md:gap-5">
        {tiles.map(({ destination, packageCount, mediaId }, index) => (
          <li key={destination.id} className={TILE_LAYOUT[index]}>
            <Reveal delay={index * 0.05} className="h-full">
              <Link
                href={`/destinasi/${destination.slug}`}
                className="group relative isolate flex h-full min-h-64 overflow-hidden rounded-[2px] bg-ocean-900 text-ivory-50"
              >
                <SmartImage
                  mediaId={mediaId}
                  fill
                  sizes={index === 0 ? "(min-width: 768px) 58vw, 100vw" : "(min-width: 768px) 42vw, 100vw"}
                  className="-z-20 transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
                />
                <span aria-hidden="true" className="photo-scrim absolute inset-0 -z-10" />
                <span className="mt-auto flex w-full items-end justify-between gap-4 p-5 md:p-6">
                  <span>
                    <span className="eyebrow block text-sand-300">{REGION_LABEL[destination.region]}</span>
                    <span className={cn("mt-1.5 block font-display leading-none", index === 0 ? "text-5xl md:text-6xl" : "text-4xl")}>
                      {destination.name}
                    </span>
                    <span className="mt-2 block max-w-sm text-sm text-ivory-50/85">{destination.tagline}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ivory-50/90">
                    {packageCount > 0 ? `${packageCount} paket` : "Lihat"}
                    <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  )
}
