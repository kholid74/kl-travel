import type { Metadata } from "next"
import { ManualBookingForm } from "@/features/bookings/components/manual-booking-form"

export const metadata: Metadata = { title: "Booking manual" }

export default function NewBookingPage() {
  return <ManualBookingForm />
}
