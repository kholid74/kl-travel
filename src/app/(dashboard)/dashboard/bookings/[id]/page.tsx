import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { BookingDetailRoute } from "@/features/bookings/components/booking-detail"

export const metadata: Metadata = { title: "Detail booking" }

export default function BookingDetailPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="detail" />}>
      <BookingDetailRoute />
    </Suspense>
  )
}
