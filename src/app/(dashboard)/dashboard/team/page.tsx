import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { TeamPage } from "@/features/team/components/team-page"

export const metadata: Metadata = { title: "Tim & Peran" }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TeamPage />
    </Suspense>
  )
}
