"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import { ArrowRight, Check, X } from "lucide-react"
import type { Settings } from "@/domain/entities"
import { FITNESS_LABEL, REGION_LABEL, TRIP_TYPE_LABEL } from "@/domain/labels"
import { formatDuration, formatIDR } from "@/lib/format"
import { Breadcrumbs } from "@/components/public/breadcrumbs"
import { FaqList } from "@/components/public/faq-list"
import { ItineraryTimeline } from "@/components/public/itinerary-timeline"
import { NotFoundState } from "@/components/public/not-found-state"
import { PackageCard } from "@/components/public/package-card"
import { TripTypeBadge } from "@/components/shared/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { PublicCatalog } from "@/services/queries/catalog"
import { availabilityLine } from "../availability"
import { useAvailabilityMap, useBookingSettings, usePackageAvailability, usePublicCatalog } from "../hooks/use-public-catalog"
import { BookingPanel, MobileBookingBar, paxLimits } from "./booking-panel"
import { DepartureList } from "./departure-list"
import { ItineraryDownload } from "./itinerary-download"
import { PackageGallery } from "./package-gallery"
import { PackagePolicies } from "./package-policies"

interface DetailProps {
  slug: string
  initialCatalog: PublicCatalog
  initialSettings: Settings["booking"]
}

/** Reads ?keberangkatan= and ?peserta=; must sit inside <Suspense>. */
export function PackageDetailRoute(props: DetailProps) {
  const params = useSearchParams()
  const pax = Number(params.get("peserta"))
  return <PackageDetail {...props} preselectCode={params.get("keberangkatan")} initialPax={Number.isInteger(pax) && pax > 0 ? pax : null} />
}

export function PackageDetailFallback(props: DetailProps) {
  return <PackageDetail {...props} preselectCode={null} initialPax={null} />
}

function SectionTitle({ id, eyebrow, children, action }: { id: string; eyebrow: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div>
        <p className="eyebrow text-lagoon-700">{eyebrow}</p>
        <h2 id={id} className="mt-2 font-display text-[2rem] leading-tight text-ocean-900 md:text-[2.375rem]">
          {children}
        </h2>
      </div>
      {action}
    </div>
  )
}

function PackageDetail({ slug, initialCatalog, initialSettings, preselectCode, initialPax }: DetailProps & { preselectCode: string | null; initialPax: number | null }) {
  const { packages, destinations, live } = usePublicCatalog(initialCatalog)
  const settings = useBookingSettings(initialSettings)
  const pkg = packages.find((p) => p.slug === slug)
  const destination = pkg ? destinations.find((d) => d.id === pkg.destinationId) : undefined
  const availability = usePackageAvailability(pkg?.id)
  const [chosenId, setChosenId] = useState<string | null>(null)
  const [paxChoice, setPaxChoice] = useState<number | null>(initialPax)

  const related = useMemo(() => {
    if (!pkg) return []
    const sameDestination = packages.filter((p) => p.id !== pkg.id && p.destinationId === pkg.destinationId)
    const sameType = packages.filter((p) => p.id !== pkg.id && p.destinationId !== pkg.destinationId && p.tripType === pkg.tripType)
    return [...sameDestination, ...sameType].slice(0, 3)
  }, [packages, pkg])
  const relatedAvailability = useAvailabilityMap(related.map((p) => p.id))

  if (!pkg || !destination) {
    if (!live) return <PackageDetailSkeleton />
    return (
      <NotFoundState
        title="Paket tidak ditemukan"
        description="Paket ini mungkin sudah tidak ditawarkan atau tautannya berubah. Lihat paket lain yang tersedia."
        backHref="/paket"
        backLabel="Lihat semua paket"
      />
    )
  }

  const open = pkg.tripType === "open"
  const options = availability?.options ?? null
  const bookable = (id: string | undefined) => options?.find((o) => o.bookable && (o.departure.id === id || o.departure.code === id))
  const selected = open ? (bookable(chosenId ?? undefined) ?? bookable(preselectCode ?? undefined) ?? availability?.next ?? null) : null
  const limits = paxLimits({ pkg, selected, maxPaxPerBooking: settings.maxPaxPerBooking })
  const pax = Math.min(limits.max, Math.max(limits.min, paxChoice ?? limits.min))
  const selection = { pkg, availability, selected, pax, onPaxChange: setPaxChoice, maxPaxPerBooking: settings.maxPaxPerBooking }
  const itineraryDownload = { pkg, destinationName: destination.name, regionLabel: REGION_LABEL[destination.region], options, selectedId: selected?.departure.id }

  const facts = [
    { label: "Durasi", value: formatDuration(pkg.durationDays, pkg.durationNights, "long") },
    { label: "Jenis trip", value: TRIP_TYPE_LABEL[pkg.tripType] },
    {
      label: open ? "Ukuran grup" : "Peserta",
      value: open ? `Maks. ${pkg.groupSize.max} orang` : pkg.groupSize.min === pkg.groupSize.max ? `${pkg.groupSize.min} orang` : `${pkg.groupSize.min}–${pkg.groupSize.max} orang`,
    },
    { label: "Tingkat aktivitas", value: FITNESS_LABEL[pkg.requirements.fitness] },
    ...(pkg.requirements.minAge !== undefined ? [{ label: "Usia minimal", value: `${pkg.requirements.minAge} tahun` }] : []),
  ]
  const sections = [
    { id: "ringkasan", label: "Ringkasan" },
    { id: "itinerary", label: "Itinerary" },
    { id: "fasilitas", label: "Fasilitas" },
    { id: "jadwal", label: open ? "Jadwal" : "Harga" },
    { id: "info", label: "Info penting" },
    ...(pkg.faqs.length ? [{ id: "faq", label: "FAQ" }] : []),
  ]

  return (
    <>
      <div className="container-page pt-6 md:pt-8">
        <Breadcrumbs
          items={[
            { label: "Beranda", href: "/" },
            { label: "Paket wisata", href: "/paket" },
            { label: destination.name, href: `/destinasi/${destination.slug}` },
            { label: pkg.title },
          ]}
        />
        <div className="mt-5">
          <PackageGallery mediaIds={[pkg.coverMediaId, ...pkg.galleryMediaIds]} title={pkg.title} />
        </div>

        <header className="mt-8 max-w-3xl md:mt-10">
          <div className="flex flex-wrap items-center gap-3">
            <TripTypeBadge type={pkg.tripType} />
            <Link href={`/destinasi/${destination.slug}`} className="eyebrow text-muted-foreground hover:text-foreground">
              {destination.name} · {REGION_LABEL[destination.region]}
            </Link>
          </div>
          <h1 className="mt-4 font-display text-display-lg text-balance text-ocean-900">{pkg.title}</h1>
          <p className="mt-4 text-body-lg text-pretty text-muted-foreground">{pkg.summary}</p>
          <ItineraryDownload {...itineraryDownload} variant="link" className="mt-5" />
        </header>
      </div>

      <nav
        aria-label="Bagian halaman"
        className="sticky top-16 z-20 mt-8 border-y border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 md:top-[72px]"
      >
        <ul className="container-page flex gap-6 overflow-x-auto no-scrollbar">
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="block py-3.5 text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground">
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="container-page grid gap-12 pt-10 pb-20 lg:grid-cols-12 lg:gap-14 lg:pb-28">
        <div className="min-w-0 space-y-16 lg:col-span-8 md:space-y-20">
          <section aria-labelledby="ringkasan" className="scroll-mt-36">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-b border-border pb-8 sm:grid-cols-3 lg:grid-cols-5">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">{fact.value}</dd>
                </div>
              ))}
            </dl>
            <h2 id="ringkasan" className="sr-only">
              Ringkasan
            </h2>
            <div className="mt-8 max-w-prose space-y-4 text-[1.0625rem] leading-relaxed text-foreground">
              {pkg.overview.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {pkg.highlights.map((highlight) => (
                <li key={highlight} className="flex gap-3 rounded-[4px] bg-ivory-100 px-4 py-3.5 text-sm font-medium text-ocean-900">
                  <span aria-hidden="true" className="mt-2 h-px w-4 shrink-0 bg-sand-500" />
                  {highlight}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="itinerary" className="scroll-mt-36">
            <SectionTitle id="itinerary" eyebrow="Itinerary" action={<ItineraryDownload {...itineraryDownload} />}>
              {pkg.itinerary.length > 1 ? `${pkg.itinerary.length} hari, hari demi hari` : "Rencana perjalanan"}
            </SectionTitle>
            <ItineraryTimeline days={pkg.itinerary} />
          </section>

          <section aria-labelledby="fasilitas" className="scroll-mt-36">
            <SectionTitle id="fasilitas" eyebrow="Fasilitas">
              Termasuk dan tidak termasuk
            </SectionTitle>
            <div className="grid gap-10 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-ocean-900">Sudah termasuk</h3>
                <ul className="mt-4 space-y-2.5">
                  {pkg.inclusions.map((item) => (
                    <li key={item} className="flex gap-3 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-tone-success" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ocean-900">Belum termasuk</h3>
                <ul className="mt-4 space-y-2.5">
                  {pkg.exclusions.map((item) => (
                    <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                      <X className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section aria-labelledby="jadwal" className="scroll-mt-36">
            {open ? (
              <>
                <SectionTitle id="jadwal" eyebrow="Jadwal">
                  Pilih tanggal keberangkatan
                </SectionTitle>
                <DepartureList options={options} selectedId={selected?.departure.id ?? null} onSelect={setChosenId} packageSlug={pkg.slug} />
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Sisa kursi sudah memperhitungkan kursi yang sedang ditahan untuk pemesanan lain. <strong>Pasti berangkat</strong> berarti
                  jumlah peserta minimum sudah tercapai.
                </p>
              </>
            ) : (
              <>
                <SectionTitle id="jadwal" eyebrow="Harga">
                  Tanggal pilihan Anda, harga sesuai ukuran grup
                </SectionTitle>
                {pkg.pricing.kind === "tiered" && (
                  <div className="overflow-hidden rounded-[4px] border border-border">
                    <table className="w-full text-sm">
                      <caption className="sr-only">Harga per orang menurut jumlah peserta</caption>
                      <thead className="bg-ivory-100 text-left text-xs text-muted-foreground">
                        <tr>
                          <th scope="col" className="px-4 py-3 font-medium">
                            Jumlah peserta
                          </th>
                          <th scope="col" className="px-4 py-3 text-right font-medium">
                            Harga per orang
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card">
                        {pkg.pricing.tiers.map((tier) => (
                          <tr key={tier.minPax}>
                            <th scope="row" className="px-4 py-3 text-left font-medium">
                              {tier.minPax === tier.maxPax ? `${tier.minPax} orang` : `${tier.minPax}–${tier.maxPax} orang`}
                            </th>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatIDR(tier.pricePerPax)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
                  Private trip berangkat di tanggal yang Anda pilih. Kirim permintaan berisi tanggal dan jumlah peserta; tim kami mengecek
                  ketersediaan kapal, akomodasi, dan guide, lalu mengirim penawaran resmi.
                </p>
              </>
            )}
          </section>

          <section aria-labelledby="info" className="scroll-mt-36">
            <SectionTitle id="info" eyebrow="Info penting">
              Sebelum Anda berangkat
            </SectionTitle>
            <PackagePolicies pkg={pkg} />
          </section>

          {pkg.faqs.length > 0 && (
            <section aria-labelledby="faq" className="scroll-mt-36">
              <SectionTitle id="faq" eyebrow="FAQ">
                Pertanyaan tentang paket ini
              </SectionTitle>
              <FaqList faqs={pkg.faqs} />
            </section>
          )}

          <section aria-label={`Tentang ${destination.name}`} className="grid gap-6 rounded-[4px] bg-ocean-900 p-6 text-ivory-50 sm:grid-cols-[1fr_auto] sm:items-end md:p-8">
            <div>
              <p className="eyebrow text-sand-300">Tentang destinasi</p>
              <p className="mt-2 font-display text-3xl">{destination.name}</p>
              <p className="mt-2 max-w-lg text-sm text-ivory-50/80">{destination.summary}</p>
              <p className="mt-4 text-sm">
                <span className="text-ivory-50/60">Waktu terbaik: </span>
                {destination.bestTime}
              </p>
            </div>
            <Link
              href={`/destinasi/${destination.slug}`}
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-sand-300 underline-offset-4 hover:underline"
            >
              Jelajahi {destination.name} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </section>
        </div>

        <aside aria-label="Pemesanan" className="hidden lg:col-span-4 lg:block">
          <div className="sticky top-[136px]">
            <BookingPanel {...selection} />
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="paket-terkait" className="border-t border-border bg-ivory-100/60 py-20 md:py-24">
          <div className="container-page">
            <h2 id="paket-terkait" className="font-display text-display-md text-ocean-900">
              Paket lain yang mungkin Anda suka
            </h2>
            <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <li key={p.id}>
                  <PackageCard
                    pkg={p}
                    destinationName={destinations.find((d) => d.id === p.destinationId)?.name ?? ""}
                    availability={availabilityLine(p, relatedAvailability ? relatedAvailability.get(p.id) : null)}
                    sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <MobileBookingBar {...selection} />
    </>
  )
}

export function PackageDetailSkeleton() {
  return (
    <div className="container-page py-8" aria-busy="true" aria-label="Memuat paket">
      <Skeleton className="h-4 w-64" />
      <Skeleton className="mt-5 h-[min(64vh,560px)] rounded-[2px]" />
      <Skeleton className="mt-10 h-12 w-2/3" />
      <Skeleton className="mt-4 h-5 w-1/2" />
    </div>
  )
}
