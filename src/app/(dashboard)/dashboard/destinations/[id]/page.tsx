import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { DestinationEditorRoute } from "@/features/destinations/components/admin/destination-admin"

export const metadata: Metadata = { title: "Edit destinasi" }

export default function EditDestinationPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="detail" />}>
      <DestinationEditorRoute />
    </Suspense>
  )
}
