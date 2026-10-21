"use client"

import Link from "next/link"
import { useMemo } from "react"
import { ArrowRight, CalendarRange, MapPin, Plane } from "lucide-react"
import { DESTINATION_CATEGORY_LABEL, REGION_LABEL } from "@/domain/labels"
import { ArticleCard } from "@/components/public/article-card"
import { Breadcrumbs } from "@/components/public/breadcrumbs"
import { Reveal } from "@/components/public/motion"
import { NotFoundState } from "@/components/public/not-found-state"
import { PackageCard } from "@/components/public/package-card"
import { PhotoCredit, SmartImage } from "@/components/shared/smart-image"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { usePublicContent } from "@/features/content/hooks/use-public-content"
import { availabilityLine } from "@/features/packages/availability"
import { PackageGallery } from "@/features/packages/components/package-gallery"
import { useAvailabilityMap, usePublicCatalog } from "@/features/packages/hooks/use-public-catalog"
import type { PublicCatalog, PublicContent } from "@/services/queries/catalog"

export function DestinationDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat destinasi">
      <div className="h-[70svh] bg-ocean-950" />
      <div className="container-page py-12">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="mt-4 h-24 w-full max-w-2xl" />
      </div>
    </div>
  )
}

export function DestinationDetail({ slug, initialCatalog, initialContent }: { slug: string; initialCatalog: PublicCatalog; initialContent: PublicContent }) {
  const { destinations, packages, live } = usePublicCatalog(initialCatalog)
  const { articles } = usePublicContent(initialContent)
  const destination = destinations.find((d) => d.slug === slug)
  const related = useMemo(() => (destination ? packages.filter((p) => p.destinationId === destination.id) : []), [packages, destination])
  const availability = useAvailabilityMap(related.map((p) => p.id))

  if (!destination) {
    if (!live) return <DestinationDetailSkeleton />
    return (
      <>
        <div className="h-40 bg-ocean-950" />
        <NotFoundState title="Destinasi tidak ditemukan" description="Destinasi ini mungkin belum dipublikasikan." backHref="/destinasi" backLabel="Lihat semua destinasi" />
      </>
    )
  }

  const relatedArticles = articles.filter((a) => a.destinationId === destination.id).slice(0, 3)
  const facts = [
    { icon: MapPin, label: "Provinsi", value: destination.province },
    { icon: CalendarRange, label: "Waktu terbaik", value: destination.bestTime },
    { icon: Plane, label: "Cara menuju", value: destination.gettingThere },
  ]

  return (
    <>
      <section className="relative isolate flex min-h-[78svh] items-end overflow-hidden bg-ocean-950 text-ivory-50">
        <SmartImage mediaId={destination.coverMediaId} fill preload sizes="100vw" className="-z-20 motion-safe:animate-[hero-settle_1.6s_var(--ease-out-soft)_both]" />
        <div aria-hidden="true" className="photo-scrim absolute inset-0 -z-10" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-ocean-950/55 to-transparent" />
        <div className="container-page w-full pt-32 pb-12 md:pb-16">
          <Breadcrumbs
            className="[&_a]:text-ivory-50/75 [&_a:hover]:text-ivory-50 [&_li]:text-ivory-50/75 [&_span[aria-current]]:text-ivory-50"
            items={[{ label: "Beranda", href: "/" }, { label: "Destinasi", href: "/destinasi" }, { label: destination.name }]}
          />
          <p className="mt-6 eyebrow text-sand-300">{REGION_LABEL[destination.region]}</p>
          <h1 className="mt-3 font-display text-display-xl">{destination.name}</h1>
          <p className="mt-4 max-w-xl text-body-lg text-ivory-50/85">{destination.tagline}</p>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
            <ul className="flex flex-wrap gap-2" aria-label="Kategori">
              {destination.categories.map((category) => (
                <li key={category} className="rounded-full border border-ivory-50/40 px-3 py-1 text-xs font-medium">
                  {DESTINATION_CATEGORY_LABEL[category]}
                </li>
              ))}
            </ul>
            <PhotoCredit mediaId={destination.coverMediaId} className="text-ivory-50/60" />
          </div>
        </div>
      </section>

      <section className="container-page grid gap-12 py-16 md:py-24 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <p className="font-display text-3xl leading-snug text-balance text-ocean-900 md:text-[2.125rem]">{destination.summary}</p>
          <div className="mt-8 max-w-prose space-y-4 text-[1.0625rem] leading-relaxed">
            {destination.description.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
        <aside className="lg:col-span-5">
          <dl className="divide-y divide-border border-y border-border">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="py-5">
                <dt className="flex items-center gap-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <Icon className="size-5 shrink-0 text-lagoon-700" strokeWidth={1.75} aria-hidden="true" />
                  {label}
                </dt>
                <dd className="mt-1 pl-9 text-sm leading-relaxed">{value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </section>

      <section aria-labelledby="sorotan" className="bg-ivory-100/60 py-16 md:py-24">
        <div className="container-page">
          <h2 id="sorotan" className="font-display text-display-md text-ocean-900">
            Yang tidak boleh dilewatkan
          </h2>
          <ol className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {destination.highlights.map((highlight, index) => (
              <li key={highlight} className="border-t border-ocean-900/80 pt-5">
                <Reveal delay={index * 0.05}>
                  <span aria-hidden="true" className="font-display text-3xl text-sand-600 tabular-nums">
                    0{index + 1}
                  </span>
                  <p className="mt-3 font-medium text-pretty text-ocean-900">{highlight}</p>
                </Reveal>
              </li>
            ))}
          </ol>
          {destination.galleryMediaIds.length > 0 && (
            <div className="mt-14">
              <PackageGallery mediaIds={destination.galleryMediaIds} title={destination.name} preloadFirst={false} />
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="paket-destinasi" className="container-page py-16 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-lagoon-700">Paket</p>
            <h2 id="paket-destinasi" className="mt-2 font-display text-display-md text-ocean-900">
              Menjelajah {destination.name} bersama kami
            </h2>
          </div>
          <Link
            href={`/paket?destinasi=${destination.slug}`}
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-lagoon-700 underline-offset-4 hover:underline"
          >
            Lihat di daftar paket <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
        {related.length === 0 ? (
          <p className="mt-8 text-muted-foreground">Belum ada paket terjadwal untuk destinasi ini. Kami bisa merancangnya khusus untuk Anda.</p>
        ) : (
          <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((pkg) => (
              <li key={pkg.id}>
                <PackageCard
                  pkg={pkg}
                  destinationName={destination.name}
                  availability={availabilityLine(pkg, availability ? availability.get(pkg.id) : null)}
                  sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-14 flex flex-col items-start gap-4 rounded-[4px] bg-ocean-900 p-6 text-ivory-50 sm:flex-row sm:items-center sm:justify-between md:p-8">
          <p className="max-w-xl">
            <span className="block font-display text-3xl">Punya rencana sendiri ke {destination.name}?</span>
            <span className="mt-1 block text-sm text-ivory-50/80">Gabungkan dengan destinasi lain, atur temponya, kami susun itinerary-nya.</span>
          </p>
          <Button asChild variant="sand" size="lg" className="shrink-0">
            <Link href={`/custom-trip?destinasi=${destination.slug}`}>Rancang custom trip</Link>
          </Button>
        </div>
      </section>

      {relatedArticles.length > 0 && (
        <section aria-labelledby="bacaan" className="border-t border-border py-16 md:py-24">
          <div className="container-page">
            <h2 id="bacaan" className="font-display text-display-md text-ocean-900">
              Bacaan sebelum berangkat
            </h2>
            <ul className="mt-10 grid gap-x-6 gap-y-12 md:grid-cols-3">
              {relatedArticles.map((article) => (
                <li key={article.id}>
                  <ArticleCard article={article} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  )
}
