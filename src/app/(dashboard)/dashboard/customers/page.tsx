import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { CustomerList } from "@/features/customers/components/customer-list"

export const metadata: Metadata = { title: "Pelanggan" }

export default function CustomersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CustomerList />
    </Suspense>
  )
}
