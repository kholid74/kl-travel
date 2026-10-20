import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { BookingList } from "@/features/bookings/components/booking-list"

export const metadata: Metadata = { title: "Booking" }

export default function BookingsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BookingList />
    </Suspense>
  )
}
