import type { Metadata } from "next"
import { Suspense } from "react"
import { FlowSkeleton } from "@/components/public/flow-shell"
import { BookingFlowRoute } from "@/features/bookings/components/booking-flow"
import { getSeedCatalog, getSeedCatalogPackages, getSeedSettings } from "@/services/catalog-server"

export const metadata: Metadata = { title: "Pesan open trip" }

export function generateStaticParams() {
  return getSeedCatalogPackages()
    .filter((pkg) => pkg.tripType === "open")
    .map((pkg) => ({ slug: pkg.slug }))
}

/** Open Trip booking wizard. Rendered in the browser: it reads live seats and the URL. */
export default function BookingPage() {
  return (
    <Suspense fallback={<FlowSkeleton />}>
      <BookingFlowRoute initialCatalog={getSeedCatalog()} initialSettings={getSeedSettings().booking} />
    </Suspense>
  )
}
