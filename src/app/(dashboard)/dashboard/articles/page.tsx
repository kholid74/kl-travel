import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { ArticleList } from "@/features/content/components/admin/article-list"

export const metadata: Metadata = { title: "Artikel" }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ArticleList />
    </Suspense>
  )
}
