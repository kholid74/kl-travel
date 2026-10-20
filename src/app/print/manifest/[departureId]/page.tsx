import type { Metadata } from "next"
import { Suspense } from "react"
import { PrintSkeleton } from "@/features/invoices/components/invoice-print"
import { ManifestPrintRoute } from "@/features/operations/components/manifest-print"

export const metadata: Metadata = { title: "Cetak manifest" }

export default function ManifestPrintPage() {
  return (
    <Suspense fallback={<PrintSkeleton />}>
      <ManifestPrintRoute />
    </Suspense>
  )
}
