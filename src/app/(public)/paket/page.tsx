import type { Metadata } from "next"
import { Suspense } from "react"
import { PackageExplorerFallback, PackageExplorerRoute } from "@/features/packages/components/package-explorer"
import { getSeedCatalog } from "@/services/catalog-server"

export const metadata: Metadata = {
  title: "Paket wisata",
  description: "Open trip, private trip, dan dasar custom trip ke destinasi alam dan budaya Nusantara, lengkap dengan jadwal dan sisa kursi.",
}

export default function PackagesPage() {
  const catalog = getSeedCatalog()
  return (
    <>
      <header className="container-page pt-12 pb-10 md:pt-16 md:pb-12">
        <p className="eyebrow text-lagoon-700">Paket wisata</p>
        <h1 className="mt-3 max-w-3xl font-display text-display-lg text-balance text-ocean-900">Pilih cara Anda menjelajah Nusantara</h1>
        <p className="mt-4 max-w-2xl text-body-lg text-muted-foreground">
          Bergabung dengan open trip di jadwal yang sudah pasti, pakai itinerary kami untuk private trip, atau mulai dari salah satu
          paket untuk merancang custom trip.
        </p>
      </header>
      <Suspense fallback={<PackageExplorerFallback initialCatalog={catalog} />}>
        <PackageExplorerRoute initialCatalog={catalog} />
      </Suspense>
    </>
  )
}
