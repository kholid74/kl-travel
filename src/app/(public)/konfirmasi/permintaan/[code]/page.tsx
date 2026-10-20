import type { Metadata } from "next"
import { Suspense } from "react"
import { ConfirmationSkeleton } from "@/components/public/flow-shell"
import { InquiryConfirmationRoute } from "@/features/inquiries/components/inquiry-confirmation"

export const metadata: Metadata = { title: "Status permintaan" }

/** Request codes only exist in the visitor's browser, so the page resolves there. */
export default function InquiryConfirmationPage() {
  return (
    <Suspense fallback={<ConfirmationSkeleton />}>
      <InquiryConfirmationRoute />
    </Suspense>
  )
}
