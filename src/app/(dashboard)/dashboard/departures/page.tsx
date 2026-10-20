import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { DepartureList } from "@/features/departures/components/departure-list"

export const metadata: Metadata = { title: "Keberangkatan" }

export default function DeparturesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DepartureList />
    </Suspense>
  )
}
