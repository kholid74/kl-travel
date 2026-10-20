import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { SettingsPage } from "@/features/settings/components/settings-page"

export const metadata: Metadata = { title: "Pengaturan" }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SettingsPage />
    </Suspense>
  )
}
