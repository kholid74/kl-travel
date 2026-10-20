import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { SiteContent } from "@/domain/entities"
import { PhotoCredit, SmartImage } from "@/components/shared/smart-image"
import { Button } from "@/components/ui/button"

/** Full-bleed cinematic hero; content comes from Site Content. */
export function Hero({ hero, children }: { hero: SiteContent["hero"]; children?: React.ReactNode }) {
  return (
    <section className="relative isolate flex min-h-[88svh] items-end overflow-hidden bg-ocean-950 text-ivory-50 md:min-h-[92vh]">
      <SmartImage
        mediaId={hero.mediaId}
        fill
        priority
        sizes="100vw"
        className="-z-20 motion-safe:animate-[hero-settle_1.6s_var(--ease-out-soft)_both]"
      />
      <div aria-hidden="true" className="photo-scrim absolute inset-0 -z-10" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-ocean-950/50 to-transparent" />

      <div className="container-page w-full pt-32 pb-12 md:pb-20">
        <p className="eyebrow text-sand-300">{hero.eyebrow}</p>
        <h1 className="mt-4 max-w-4xl font-display text-display-xl text-balance">{hero.title}</h1>
        <p className="mt-5 max-w-xl text-body-lg text-ivory-50/85">{hero.subtitle}</p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button asChild size="lg" variant="sand">
            <Link href="/paket?jenis=open">
              {hero.ctaLabel} <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
        {children && <div className="mt-10 md:mt-14">{children}</div>}
        <PhotoCredit mediaId={hero.mediaId} className="mt-8 inline-block text-ivory-50/60" />
      </div>
    </section>
  )
}
