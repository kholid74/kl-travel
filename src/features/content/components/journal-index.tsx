"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { Article } from "@/domain/entities"
import { ARTICLE_CATEGORY_LABEL } from "@/domain/labels"
import { ArticleCard } from "@/components/public/article-card"
import { ChipToggle } from "@/components/shared/choice"
import { EmptyState } from "@/components/shared/states"
import type { PublicContent } from "@/services/queries/catalog"
import { usePublicContent } from "../hooks/use-public-content"

type Category = Article["category"]
const CATEGORIES = Object.keys(ARTICLE_CATEGORY_LABEL) as Category[]

/** Reads ?kategori=; must sit inside <Suspense>. */
export function JournalIndexRoute({ initialContent }: { initialContent: PublicContent }) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const raw = params.get("kategori")
  const category = raw && raw in ARTICLE_CATEGORY_LABEL ? (raw as Category) : null
  return (
    <JournalIndex
      initialContent={initialContent}
      category={category}
      onCategory={(next) => router.replace(next ? `${pathname}?kategori=${next}` : pathname, { scroll: false })}
    />
  )
}

export function JournalIndexFallback({ initialContent }: { initialContent: PublicContent }) {
  return <JournalIndex initialContent={initialContent} category={null} onCategory={() => {}} />
}

function JournalIndex({
  initialContent,
  category,
  onCategory,
}: {
  initialContent: PublicContent
  category: Category | null
  onCategory: (category: Category | null) => void
}) {
  const { articles } = usePublicContent(initialContent)
  const visible = category ? articles.filter((a) => a.category === category) : articles
  const [lead, ...rest] = visible

  return (
    <div className="container-page pb-24">
      <div className="flex flex-wrap gap-2 border-y border-border py-4" role="group" aria-label="Kategori artikel">
        <ChipToggle pressed={!category} onPressedChange={() => onCategory(null)}>
          Semua
        </ChipToggle>
        {CATEGORIES.map((key) => (
          <ChipToggle key={key} pressed={category === key} onPressedChange={(on) => onCategory(on ? key : null)}>
            {ARTICLE_CATEGORY_LABEL[key]}
          </ChipToggle>
        ))}
      </div>

      {!lead ? (
        <EmptyState className="mt-8" title="Belum ada artikel di kategori ini" description="Coba kategori lain." />
      ) : (
        <>
          <div className="mt-10">
            <ArticleCard article={lead} variant="feature" sizes="(min-width: 1280px) 1180px, 100vw" className="md:[&>div:first-child]:aspect-[21/9]" />
          </div>
          {rest.length > 0 && (
            <ul className="mt-16 grid gap-x-6 gap-y-12 border-t border-border pt-12 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((article) => (
                <li key={article.id}>
                  <ArticleCard article={article} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
