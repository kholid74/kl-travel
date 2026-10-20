import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { PackageEditorRoute } from "@/features/packages/components/admin/package-editor"

export const metadata: Metadata = { title: "Edit paket" }

export default function EditPackagePage() {
  return (
    <Suspense fallback={<PageSkeleton variant="detail" />}>
      <PackageEditorRoute />
    </Suspense>
  )
}
