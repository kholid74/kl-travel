import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { TestimonialAdmin } from "@/features/content/components/admin/testimonial-admin"

export const metadata: Metadata = { title: "Testimoni" }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TestimonialAdmin />
    </Suspense>
  )
}
