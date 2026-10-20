import type { Metadata } from "next"
import { Suspense } from "react"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { ArticleEditorRoute } from "@/features/content/components/admin/article-editor"

export const metadata: Metadata = { title: "Edit artikel" }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton variant="detail" />}>
      <ArticleEditorRoute />
    </Suspense>
  )
}
