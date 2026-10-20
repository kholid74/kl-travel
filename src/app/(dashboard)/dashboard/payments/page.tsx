import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { PaymentsPage } from "@/features/payments/components/payments-page"

export const metadata: Metadata = { title: "Pembayaran" }

export default function PaymentsRoute() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PaymentsPage />
    </Suspense>
  )
}
