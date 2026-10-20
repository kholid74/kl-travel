import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { DestinationList } from "@/features/destinations/components/admin/destination-admin"

export const metadata: Metadata = { title: "Destinasi" }

export default function DestinationsAdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DestinationList />
    </Suspense>
  )
}
