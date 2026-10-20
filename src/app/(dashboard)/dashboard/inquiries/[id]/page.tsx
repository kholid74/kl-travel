import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { InquiryDetailRoute } from "@/features/inquiries/components/inquiry-detail"

export const metadata: Metadata = { title: "Detail inquiry" }

export default function InquiryDetailPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="detail" />}>
      <InquiryDetailRoute />
    </Suspense>
  )
}
