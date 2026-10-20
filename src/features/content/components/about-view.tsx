"use client"

import Link from "next/link"
import { Quote } from "lucide-react"
import { PhotoCredit, SmartImage } from "@/components/shared/smart-image"
import { Reveal } from "@/components/public/motion"
import { usePublicCatalog } from "@/features/packages/hooks/use-public-catalog"
import type { PublicCatalog, PublicContent } from "@/services/queries/catalog"
import { usePublicContent } from "../hooks/use-public-content"

export function AboutView({ initialContent, initialCatalog }: { initialContent: PublicContent; initialCatalog: PublicCatalog }) {
  const { siteContent, testimonials } = usePublicContent(initialContent)
  const { packages } = usePublicCatalog(initialCatalog)
  const { about } = siteContent
  const [heroMedia, secondMedia] = about.mediaIds

  return (
    <>
      <section className="relative isolate flex min-h-[72svh] items-end overflow-hidden bg-ocean-950 text-ivory-50">
        {heroMedia && <SmartImage mediaId={heroMedia} fill preload sizes="100vw" className="-z-20" />}
        <div aria-hidden="true" className="photo-scrim absolute inset-0 -z-10" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-ocean-950/55 to-transparent" />
        <div className="container-page w-full pt-32 pb-12 md:pb-16">
          <p className="eyebrow text-sand-300">Tentang kami</p>
          <h1 className="mt-4 max-w-4xl font-display text-display-lg text-balance">{about.headline}</h1>
          {heroMedia && <PhotoCredit mediaId={heroMedia} className="mt-8 inline-block text-ivory-50/60" />}
        </div>
      </section>

      <section className="container-page grid gap-10 py-16 md:py-24 lg:grid-cols-12 lg:gap-16">
        <p className="font-display text-3xl leading-snug text-balance text-ocean-900 md:text-[2.375rem] lg:col-span-6">{about.intro}</p>
        <div className="max-w-prose space-y-5 text-[1.0625rem] leading-relaxed lg:col-span-6 lg:pt-2">
          {about.story.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      {secondMedia && (
        <div className="container-page">
          <div className="relative aspect-[16/9] overflow-hidden rounded-[2px] bg-muted md:aspect-[21/9]">
            <SmartImage mediaId={secondMedia} fill sizes="(min-width: 1280px) 1184px, 100vw" />
          </div>
          <PhotoCredit mediaId={secondMedia} className="mt-2 inline-block text-muted-foreground" />
        </div>
      )}

      <section aria-labelledby="nilai" className="container-page py-16 md:py-24">
        <h2 id="nilai" className="font-display text-display-md text-ocean-900">
          Yang kami pegang
        </h2>
        <ol className="mt-10 grid gap-x-8 gap-y-10 md:grid-cols-3">
          {about.values.map((value, index) => (
            <li key={value.title} className="border-t border-ocean-900/80 pt-6">
              <Reveal delay={index * 0.06}>
                <span aria-hidden="true" className="font-display text-3xl text-sand-600 tabular-nums">
                  0{index + 1}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-ocean-900">{value.title}</h3>
                <p className="mt-2 text-muted-foreground">{value.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {testimonials.length > 0 && (
        <section aria-labelledby="cerita-tamu" className="bg-ivory-100/60 py-16 md:py-24">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="cerita-tamu" className="font-display text-display-md text-ocean-900">
                Cerita dari perjalanan
              </h2>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                <span className="mr-1.5 rounded-sm bg-sand-100 px-1.5 py-0.5 font-semibold text-sand-800 uppercase">Ilustrasi</span>
                Testimoni berikut adalah contoh untuk keperluan demonstrasi, bukan ulasan pelanggan sungguhan.
              </p>
            </div>
            <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((testimonial) => {
                const pkg = testimonial.packageId ? packages.find((p) => p.id === testimonial.packageId) : undefined
                return (
                  <li key={testimonial.id}>
                    <figure className="flex h-full flex-col rounded-[4px] border border-border bg-card p-6">
                      <Quote className="size-6 text-sand-500" aria-hidden="true" />
                      <blockquote className="mt-4 flex-1 font-display text-[1.375rem] leading-snug text-ocean-900">{testimonial.quote}</blockquote>
                      <figcaption className="mt-6 text-sm">
                        <span className="font-semibold">{testimonial.authorName}</span>
                        {pkg && (
                          <Link href={`/paket/${pkg.slug}`} className="block text-muted-foreground underline-offset-4 hover:underline">
                            {pkg.title}
                          </Link>
                        )}
                      </figcaption>
                    </figure>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}

      <section className="container-page py-16 md:py-20">
        <div className="max-w-2xl border-l-2 border-sand-500 pl-6">
          <p className="eyebrow text-muted-foreground">Tentang situs ini</p>
          <p className="mt-3 text-muted-foreground">
            NusaVista Journey adalah brand fiktif. Situs dan dashboard operasionalnya dibuat sebagai showcase oleh Kalsara Digital Studio,
            sehingga seluruh data, harga, dan transaksi di sini adalah simulasi.{" "}
            <Link href="/demo" className="font-semibold text-lagoon-700 underline underline-offset-4">
              Pelajari showcase ini
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  )
}
