import type { Metadata } from "next"
import { listMedia } from "@/data/media"
import { SmartImage } from "@/components/shared/smart-image"
import { getSeedDestinations } from "@/services/catalog-server"

export const metadata: Metadata = {
  title: "Kredit foto",
  description: "Daftar foto Unsplash yang dipakai di situs demonstrasi NusaVista Journey beserta fotografernya.",
}

/** Every photo with its photographer, grouped by destination (Unsplash License). */
export default function PhotoCreditsPage() {
  const destinations = getSeedDestinations()
  const media = listMedia()
  const groups = destinations
    .map((destination) => ({ destination, assets: media.filter((asset) => asset.tags.includes(destination.slug)) }))
    .filter((group) => group.assets.length > 0)
  const photographers = new Set(media.map((asset) => asset.credit.photographer)).size

  return (
    <div className="container-page pt-12 pb-24 md:pt-16">
      <p className="eyebrow text-lagoon-700">Kredit foto</p>
      <h1 className="mt-3 max-w-3xl font-display text-display-lg text-balance text-ocean-900">Foto di situs ini</h1>
      <p className="mt-4 max-w-2xl text-body-lg text-muted-foreground">
        {media.length} foto dari {photographers} fotografer di{" "}
        <a href="https://unsplash.com/license" target="_blank" rel="noreferrer" className="font-semibold text-lagoon-700 underline underline-offset-4">
          Unsplash
        </a>
        , dipakai sesuai Lisensi Unsplash. Lokasi setiap foto sudah kami cocokkan dengan destinasinya.
      </p>

      <div className="mt-14 space-y-16">
        {groups.map(({ destination, assets }) => (
          <section key={destination.id} aria-labelledby={`kredit-${destination.slug}`}>
            <h2 id={`kredit-${destination.slug}`} className="border-b border-border pb-3 font-display text-3xl text-ocean-900">
              {destination.name}
            </h2>
            <ul className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {assets.map((asset) => (
                <li key={asset.id}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[2px] bg-muted">
                    <SmartImage mediaId={asset.id} fill sizes="(min-width: 1024px) 290px, (min-width: 640px) 50vw, 100vw" />
                  </div>
                  <p className="mt-2 text-sm leading-snug">{asset.alt}</p>
                  <a href={asset.credit.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-muted-foreground underline-offset-4 hover:underline">
                    {asset.credit.photographer} / Unsplash
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
