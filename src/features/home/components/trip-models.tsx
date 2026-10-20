"use client"

import Link from "next/link"
import { useMemo } from "react"
import { ArrowRight } from "lucide-react"
import { startingPrice } from "@/domain/rules/pricing"
import { formatDuration, formatIDR } from "@/lib/format"
import { Reveal } from "@/components/public/motion"
import { SmartImage } from "@/components/shared/smart-image"
import { Button } from "@/components/ui/button"
import { usePublicCatalog } from "@/features/packages/hooks/use-public-catalog"
import type { PublicCatalog } from "@/services/queries/catalog"

const CUSTOM_STEPS = [
  { title: "Ceritakan rencana Anda", body: "Destinasi, tanggal, jumlah peserta, dan kisaran budget." },
  { title: "Terima penawaran", body: "Itinerary per hari dan rincian harga, bisa direvisi." },
  { title: "Konfirmasi & berangkat", body: "Bayar DP, kami siapkan semua detail perjalanan." },
]

/** Private and Custom Trip, told as an editorial split rather than another card grid. */
export function TripModels({ initialCatalog }: { initialCatalog: PublicCatalog }) {
  const { packages, destinations } = usePublicCatalog(initialCatalog)
  const privateTrips = useMemo(() => packages.filter((p) => p.tripType === "private").slice(0, 3), [packages])

  return (
    <section aria-labelledby="private-custom" className="py-20 md:py-28">
      <div className="container-page grid items-start gap-14 lg:grid-cols-12 lg:gap-16">
        <Reveal className="relative lg:col-span-5">
          <div className="relative aspect-[3/4] overflow-hidden rounded-[2px] bg-muted">
            <SmartImage mediaId="img-bali-terrace-golden" fill sizes="(min-width: 1024px) 40vw, 100vw" />
          </div>
          <div className="absolute -right-4 -bottom-10 hidden w-[55%] border-[6px] border-background sm:block lg:-right-10">
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
              <SmartImage mediaId="img-lbk-gili-dusk" fill sizes="25vw" />
            </div>
          </div>
        </Reveal>

        <div className="lg:col-span-7 lg:pt-6">
          <p className="eyebrow text-lagoon-700">Private trip & custom trip</p>
          <h2 id="private-custom" className="mt-3 max-w-xl font-display text-display-md text-balance text-ocean-900">
            Perjalanan untuk rombongan Anda sendiri, <em>di tanggal yang Anda pilih</em>
          </h2>

          <div className="mt-10 grid gap-10 border-t border-border pt-10 md:grid-cols-2">
            <div>
              <h3 className="text-heading font-semibold text-ocean-900">Private Trip</h3>
              <p className="mt-2 text-muted-foreground">
                Itinerary yang sudah teruji, eksklusif untuk keluarga, pasangan, atau teman kantor. Harga per orang menyesuaikan
                jumlah peserta.
              </p>
              <ul className="mt-5 divide-y divide-border border-y border-border">
                {privateTrips.map((pkg) => {
                  const price = startingPrice(pkg)
                  return (
                    <li key={pkg.id}>
                      <Link href={`/paket/${pkg.slug}`} className="group flex items-center justify-between gap-4 py-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-foreground group-hover:underline">{pkg.title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {destinations.find((d) => d.id === pkg.destinationId)?.name} ·{" "}
                            {formatDuration(pkg.durationDays, pkg.durationNights)}
                          </span>
                        </span>
                        {price !== null && (
                          <span className="shrink-0 text-right text-xs text-muted-foreground">
                            mulai <span className="block text-sm font-semibold text-foreground tabular-nums">{formatIDR(price)}</span>
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
              <Link
                href="/paket?jenis=private"
                className="group mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-lagoon-700 underline-offset-4 hover:underline"
              >
                Semua private trip <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>

            <div>
              <h3 className="text-heading font-semibold text-ocean-900">Custom Trip</h3>
              <p className="mt-2 text-muted-foreground">
                Punya rute sendiri, misalnya sailing Komodo lalu santai di Ubud? Kami susun dari awal bersama Anda.
              </p>
              <ol className="mt-5 space-y-4">
                {CUSTOM_STEPS.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="font-display text-3xl leading-none text-sand-600 tabular-nums">0{index + 1}</span>
                    <span>
                      <span className="block text-sm font-semibold text-foreground">{step.title}</span>
                      <span className="block text-sm text-muted-foreground">{step.body}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <Button asChild size="lg" className="mt-7">
                <Link href="/custom-trip">Rancang custom trip</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
