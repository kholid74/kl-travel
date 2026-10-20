import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { InvoiceDetailRoute } from "@/features/invoices/components/invoice-detail"

export const metadata: Metadata = { title: "Detail invoice" }

export default function InvoiceDetailPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="detail" />}>
      <InvoiceDetailRoute />
    </Suspense>
  )
}
