import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { CustomerProfileRoute } from "@/features/customers/components/customer-profile"

export const metadata: Metadata = { title: "Profil pelanggan" }

export default function CustomerProfilePage() {
  return (
    <Suspense fallback={<PageSkeleton variant="detail" />}>
      <CustomerProfileRoute />
    </Suspense>
  )
}
