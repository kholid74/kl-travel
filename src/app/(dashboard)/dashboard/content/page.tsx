import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { SiteContentEditor } from "@/features/content/components/admin/site-content-editor"

export const metadata: Metadata = { title: "Konten Website" }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SiteContentEditor />
    </Suspense>
  )
}
