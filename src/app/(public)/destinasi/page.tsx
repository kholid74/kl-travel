import type { Metadata } from "next"
import { Suspense } from "react"
import { DestinationExplorerFallback, DestinationExplorerRoute } from "@/features/destinations/components/destination-explorer"
import { getSeedCatalog } from "@/services/catalog-server"

export const metadata: Metadata = {
  title: "Destinasi",
  description: "Labuan Bajo, Bali, Lombok, Raja Ampat, Bromo, Yogyakarta, Belitung, dan Nusa Penida: musim terbaik, cara menuju, dan paket yang tersedia.",
}

export default function DestinationsPage() {
  const catalog = getSeedCatalog()
  return (
    <>
      <header className="container-page pt-12 pb-10 md:pt-16 md:pb-12">
        <p className="eyebrow text-lagoon-700">Destinasi</p>
        <h1 className="mt-3 max-w-3xl font-display text-display-lg text-balance text-ocean-900">Nusantara, satu pulau dalam satu waktu</h1>
        <p className="mt-4 max-w-2xl text-body-lg text-muted-foreground">
          Dari perairan Komodo hingga candi di Yogyakarta. Setiap destinasi kami lengkapi dengan musim terbaik, cara menuju ke sana, dan
          perjalanan yang bisa Anda pilih.
        </p>
      </header>
      <Suspense fallback={<DestinationExplorerFallback initialCatalog={catalog} />}>
        <DestinationExplorerRoute initialCatalog={catalog} />
      </Suspense>
    </>
  )
}
