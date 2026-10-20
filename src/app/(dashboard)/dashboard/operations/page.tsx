import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { OperationsBoard } from "@/features/operations/components/operations-board"

export const metadata: Metadata = { title: "Operasional Trip" }

export default function OperationsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OperationsBoard />
    </Suspense>
  )
}
