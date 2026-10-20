import type { Metadata } from "next"
import { Suspense } from "react"
import { FlowSkeleton } from "@/components/public/flow-shell"
import { PrivateRequestRoute } from "@/features/inquiries/components/private-request-flow"
import { getSeedCatalog, getSeedCatalogPackages, getSeedSettings } from "@/services/catalog-server"

export const metadata: Metadata = { title: "Ajukan private trip" }

export function generateStaticParams() {
  return getSeedCatalogPackages()
    .filter((pkg) => pkg.tripType === "private")
    .map((pkg) => ({ slug: pkg.slug }))
}

/** Private Trip request wizard (date → group size → special requirements → contact). */
export default function PrivateRequestPage() {
  return (
    <Suspense fallback={<FlowSkeleton />}>
      <PrivateRequestRoute initialCatalog={getSeedCatalog()} initialSettings={getSeedSettings().booking} />
    </Suspense>
  )
}
