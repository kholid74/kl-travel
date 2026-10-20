import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { SiteContent } from "@/domain/entities"
import { PhotoCredit, SmartImage } from "@/components/shared/smart-image"

/**
 * Full-bleed cinematic hero; content comes from Site Content. The trip search is the one
 * primary action, the CTA label becomes a quiet secondary link.
 */
export function Hero({ hero, search }: { hero: SiteContent["hero"]; search?: React.ReactNode }) {
  return (
    <section className="relative isolate flex min-h-[92svh] items-end overflow-hidden bg-ocean-950 text-ivory-50">
      <SmartImage
        mediaId={hero.mediaId}
        fill
        preload
        sizes="100vw"
        className="-z-20 motion-safe:animate-[hero-settle_1.6s_var(--ease-out-soft)_both]"
      />
      <div aria-hidden="true" className="photo-scrim absolute inset-0 -z-10" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-ocean-950/55 to-transparent" />

      <div className="container-page w-full pt-32 pb-10 md:pb-16">
        <p className="eyebrow text-sand-300">{hero.eyebrow}</p>
        <h1 className="mt-4 max-w-4xl font-display text-display-xl text-balance">{hero.title}</h1>
        <p className="mt-5 max-w-xl text-body-lg text-ivory-50/85">{hero.subtitle}</p>
        {search && <div className="mt-9 md:mt-11">{search}</div>}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <Link
            href="/paket?jenis=open&urut=terdekat"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-ivory-50 underline decoration-sand-300/60 underline-offset-[6px] hover:decoration-sand-300"
          >
            {hero.ctaLabel}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <PhotoCredit mediaId={hero.mediaId} className="text-ivory-50/60" />
        </div>
      </div>
    </section>
  )
}
