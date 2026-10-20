import type { Metadata } from "next"
import { Suspense } from "react"
import { ArticleSkeleton, ArticleView } from "@/features/content/components/article-view"
import { getSeedArticles, getSeedCatalog, getSeedContent } from "@/services/catalog-server"

export function generateStaticParams() {
  return getSeedArticles().map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: PageProps<"/jurnal/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const article = getSeedArticles().find((a) => a.slug === slug)
  return article ? { title: article.title, description: article.excerpt } : { title: "Jurnal" }
}

export default function ArticlePage({ params }: PageProps<"/jurnal/[slug]">) {
  return (
    <Suspense fallback={<ArticleSkeleton />}>
      <ArticleContent params={params} />
    </Suspense>
  )
}

async function ArticleContent({ params }: { params: PageProps<"/jurnal/[slug]">["params"] }) {
  const { slug } = await params
  return <ArticleView slug={slug} initialContent={getSeedContent()} initialCatalog={getSeedCatalog()} />
}
