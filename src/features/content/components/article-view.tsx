"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { ArticleBlock } from "@/domain/entities"
import { ARTICLE_CATEGORY_LABEL } from "@/domain/labels"
import { toDateOnlyWIB } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import { ArticleCard } from "@/components/public/article-card"
import { Breadcrumbs } from "@/components/public/breadcrumbs"
import { NotFoundState } from "@/components/public/not-found-state"
import { PackageCard } from "@/components/public/package-card"
import { PhotoCredit, SmartImage } from "@/components/shared/smart-image"
import { Skeleton } from "@/components/ui/skeleton"
import { availabilityLine } from "@/features/packages/availability"
import { useAvailabilityMap, usePublicCatalog } from "@/features/packages/hooks/use-public-catalog"
import type { PublicCatalog, PublicContent } from "@/services/queries/catalog"
import { readingMinutes } from "../article"
import { usePublicContent } from "../hooks/use-public-content"

function Block({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case "paragraph":
      return <p>{block.text}</p>
    case "heading":
      return <h2 className="pt-4 font-display text-[1.875rem] leading-tight text-ocean-900">{block.text}</h2>
    case "list":
      return (
        <ul className="list-disc space-y-1.5 pl-6 marker:text-sand-500">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )
    case "quote":
      return (
        <blockquote className="border-l-2 border-sand-500 py-1 pl-6 font-display text-[1.75rem] leading-snug text-ocean-900 italic">{block.text}</blockquote>
      )
    case "image":
      return (
        <figure className="my-4 md:-mx-12">
          <div className="relative aspect-[3/2] overflow-hidden rounded-[2px] bg-muted">
            <SmartImage mediaId={block.mediaId} fill sizes="(min-width: 768px) 800px, 100vw" />
          </div>
          <figcaption className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
            <span>{block.caption}</span>
            <PhotoCredit mediaId={block.mediaId} />
          </figcaption>
        </figure>
      )
  }
}

export function ArticleView({ slug, initialContent, initialCatalog }: { slug: string; initialContent: PublicContent; initialCatalog: PublicCatalog }) {
  const { articles, live } = usePublicContent(initialContent)
  const { packages, destinations } = usePublicCatalog(initialCatalog)
  const article = articles.find((a) => a.slug === slug)
  const destination = article?.destinationId ? destinations.find((d) => d.id === article.destinationId) : undefined
  const relatedPackages = destination ? packages.filter((p) => p.destinationId === destination.id).slice(0, 2) : []
  const availability = useAvailabilityMap(relatedPackages.map((p) => p.id))

  if (!article) {
    if (!live) return <ArticleSkeleton />
    return <NotFoundState title="Artikel tidak ditemukan" description="Artikel ini mungkin belum dipublikasikan." backHref="/jurnal" backLabel="Kembali ke jurnal" />
  }

  const more = articles.filter((a) => a.id !== article.id).slice(0, 3)

  return (
    <article>
      <header className="container-page max-w-4xl pt-10 text-center md:pt-14">
        <Breadcrumbs className="flex justify-center" items={[{ label: "Jurnal", href: "/jurnal" }, { label: ARTICLE_CATEGORY_LABEL[article.category] }]} />
        <h1 className="mx-auto mt-6 max-w-3xl font-display text-display-lg text-balance text-ocean-900">{article.title}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-body-lg text-pretty text-muted-foreground">{article.excerpt}</p>
        <p className="mt-6 text-sm text-muted-foreground">
          {article.authorName} · {readingMinutes(article)} menit baca
          {/* Publish dates are relative to the visitor's demo data, so they appear once it is loaded. */}
          {live && article.publishedAt && <> · {formatDate(toDateOnlyWIB(article.publishedAt), "long")}</>}
        </p>
      </header>

      <div className="container-page mt-10 max-w-6xl">
        <div className="relative aspect-[16/9] overflow-hidden rounded-[2px] bg-muted">
          <SmartImage mediaId={article.coverMediaId} fill preload sizes="(min-width: 1152px) 1152px, 100vw" />
        </div>
        <PhotoCredit mediaId={article.coverMediaId} className="mt-2 inline-block text-muted-foreground" />
      </div>

      <div className="container-page grid max-w-6xl gap-14 py-14 md:py-20 lg:grid-cols-12">
        <div className="space-y-6 text-[1.0625rem] leading-[1.8] text-foreground lg:col-span-8 lg:pr-8">
          {article.body.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </div>
        {destination && (
          <aside className="lg:col-span-4">
            <div className="space-y-8 lg:sticky lg:top-24">
              <Link href={`/destinasi/${destination.slug}`} className="group block rounded-[4px] bg-ocean-900 p-6 text-ivory-50">
                <p className="eyebrow text-sand-300">Destinasi</p>
                <p className="mt-2 font-display text-3xl">{destination.name}</p>
                <p className="mt-2 text-sm text-ivory-50/80">{destination.tagline}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sand-300">
                  Jelajahi <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
              {relatedPackages.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-ocean-900">Perjalanan terkait</p>
                  <ul className="mt-4 space-y-6">
                    {relatedPackages.map((pkg) => (
                      <li key={pkg.id}>
                        <PackageCard
                          pkg={pkg}
                          destinationName={destination.name}
                          availability={availabilityLine(pkg, availability ? availability.get(pkg.id) : null)}
                          sizes="(min-width: 1024px) 360px, 100vw"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {more.length > 0 && (
        <section aria-labelledby="artikel-lain" className="border-t border-border bg-ivory-100/60 py-16 md:py-24">
          <div className="container-page">
            <h2 id="artikel-lain" className="font-display text-display-md text-ocean-900">
              Artikel lainnya
            </h2>
            <ul className="mt-10 grid gap-x-6 gap-y-12 md:grid-cols-3">
              {more.map((a) => (
                <li key={a.id}>
                  <ArticleCard article={a} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </article>
  )
}

export function ArticleSkeleton() {
  return (
    <div className="container-page max-w-4xl py-14" aria-busy="true" aria-label="Memuat artikel">
      <Skeleton className="mx-auto h-12 w-3/4" />
      <Skeleton className="mx-auto mt-5 h-6 w-1/2" />
      <Skeleton className="mt-10 aspect-[16/9]" />
    </div>
  )
}
