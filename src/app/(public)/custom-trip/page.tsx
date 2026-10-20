import type { Metadata } from "next"
import { Suspense } from "react"
import { CustomTripFallback, CustomTripRoute } from "@/features/inquiries/components/custom-trip-flow"
import { getSeedCatalog } from "@/services/catalog-server"

export const metadata: Metadata = {
  title: "Rancang custom trip",
  description: "Ceritakan destinasi, tanggal, ukuran grup, dan budget Anda. Tim kami menyusun itinerary dan penawaran khusus.",
}

export default function CustomTripPage() {
  const catalog = getSeedCatalog()
  return (
    <Suspense fallback={<CustomTripFallback initialCatalog={catalog} />}>
      <CustomTripRoute initialCatalog={catalog} />
    </Suspense>
  )
}
