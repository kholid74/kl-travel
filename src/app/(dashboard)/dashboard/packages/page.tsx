import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { PackageList } from "@/features/packages/components/admin/package-list"

export const metadata: Metadata = { title: "Paket Wisata" }

export default function PackagesAdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PackageList />
    </Suspense>
  )
}
