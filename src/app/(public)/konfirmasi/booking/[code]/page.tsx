import type { Metadata } from "next"
import { Suspense } from "react"
import { ConfirmationSkeleton } from "@/components/public/flow-shell"
import { BookingConfirmationRoute } from "@/features/bookings/components/booking-confirmation"

export const metadata: Metadata = { title: "Status booking" }

/** Booking codes only exist in the visitor's browser, so the page resolves there. */
export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={<ConfirmationSkeleton />}>
      <BookingConfirmationRoute />
    </Suspense>
  )
}
