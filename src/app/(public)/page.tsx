import Link from "next/link"
import { Hero } from "@/components/public/hero"
import { SmartImage } from "@/components/shared/smart-image"
import { REGION_LABEL } from "@/domain/labels"
import { getSeedDestinations, getSeedSiteContent } from "@/services/catalog-server"

/**
 * Phase 1 homepage: hero and destination strip to exercise the foundation (fonts, tokens,
 * images, layout). The full 12-section homepage is built in Phase 2.
 */
export default function HomePage() {
  const content = getSeedSiteContent()
  const destinations = getSeedDestinations()
  return (
    <>
      <Hero hero={content.hero} />
      <section className="container-page py-20 md:py-28">
        <p className="eyebrow text-lagoon-700">Destinasi</p>
        <h2 className="mt-3 max-w-2xl font-display text-display-md text-ocean-900">Delapan destinasi, satu cara bepergian yang lebih tenang.</h2>
        <ul className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {destinations.map((destination) => (
            <li key={destination.id}>
              <Link href={`/destinasi/${destination.slug}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[2px] bg-muted">
                  <SmartImage
                    mediaId={destination.coverMediaId}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <p className="mt-4 eyebrow text-muted-foreground">{REGION_LABEL[destination.region]}</p>
                <p className="mt-1 font-display text-2xl text-ocean-900">{destination.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{destination.tagline}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
