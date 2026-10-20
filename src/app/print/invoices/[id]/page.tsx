import type { Metadata } from "next"
import { Suspense } from "react"
import { InvoicePrintRoute, PrintSkeleton } from "@/features/invoices/components/invoice-print"

export const metadata: Metadata = { title: "Cetak invoice" }

export default function InvoicePrintPage() {
  return (
    <Suspense fallback={<PrintSkeleton />}>
      <InvoicePrintRoute />
    </Suspense>
  )
}
