import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { CostingPage } from "@/features/costing/components/costing-page"

export const metadata: Metadata = { title: "HPP & Costing" }

export default function CostingRoute() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CostingPage />
    </Suspense>
  )
}
