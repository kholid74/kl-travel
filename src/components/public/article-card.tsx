import Link from "next/link"
import type { Article } from "@/domain/entities"
import { ARTICLE_CATEGORY_LABEL } from "@/domain/labels"
import { cn } from "@/lib/utils"
import { SmartImage } from "@/components/shared/smart-image"
import { readingMinutes } from "@/features/content/article"

/** Article teaser. `feature` = large 3:2 image with excerpt; `compact` = thumbnail row. */
export function ArticleCard({
  article,
  variant = "default",
  sizes = "(min-width: 1024px) 33vw, 100vw",
  className,
}: {
  article: Article
  variant?: "feature" | "default" | "compact"
  sizes?: string
  className?: string
}) {
  const meta = (
    <p className="eyebrow text-muted-foreground">
      {ARTICLE_CATEGORY_LABEL[article.category]} · {readingMinutes(article)} menit baca
    </p>
  )
  const title = (size: string) => (
    <h3 className={cn("font-semibold text-balance text-ocean-900", size)}>
      <Link href={`/jurnal/${article.slug}`} className="outline-none after:absolute after:inset-0 focus-visible:underline">
        {article.title}
      </Link>
    </h3>
  )

  if (variant === "compact") {
    return (
      <article className={cn("group relative grid grid-cols-[112px_1fr] gap-4 sm:grid-cols-[148px_1fr]", className)}>
        <div className="relative aspect-[4/3] overflow-hidden rounded-[2px] bg-muted">
          <SmartImage mediaId={article.coverMediaId} fill sizes="148px" className="transition-transform duration-500 group-hover:scale-[1.04]" />
        </div>
        <div className="self-center">
          {meta}
          <div className="mt-1.5">{title("text-base leading-snug")}</div>
        </div>
      </article>
    )
  }

  const feature = variant === "feature"
  return (
    <article className={cn("group relative", className)}>
      <div className={cn("relative overflow-hidden rounded-[2px] bg-muted", feature ? "aspect-[3/2]" : "aspect-[3/2]")}>
        <SmartImage
          mediaId={article.coverMediaId}
          fill
          sizes={sizes}
          className="transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.03]"
        />
      </div>
      <div className="mt-5">
        {meta}
        <div className="mt-2">{title(feature ? "font-display text-4xl leading-[1.08] font-normal md:text-[2.75rem]" : "text-lg leading-snug")}</div>
        <p className={cn("mt-3 text-pretty text-muted-foreground", feature ? "max-w-xl text-body-lg" : "line-clamp-2 text-sm")}>
          {article.excerpt}
        </p>
      </div>
    </article>
  )
}
