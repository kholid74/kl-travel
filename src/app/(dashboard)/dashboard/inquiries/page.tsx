import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { InquiryList } from "@/features/inquiries/components/inquiry-list"

export const metadata: Metadata = { title: "Inquiry & Leads" }

export default function InquiriesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InquiryList />
    </Suspense>
  )
}
