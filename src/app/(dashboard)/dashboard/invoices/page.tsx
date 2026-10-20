import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { InvoiceList } from "@/features/invoices/components/invoice-list"

export const metadata: Metadata = { title: "Invoice" }

export default function InvoicesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InvoiceList />
    </Suspense>
  )
}
