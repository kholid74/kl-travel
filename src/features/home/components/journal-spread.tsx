"use client"

import { ArticleCard } from "@/components/public/article-card"
import { Reveal } from "@/components/public/motion"
import { SectionHeading } from "@/components/public/section-heading"
import { usePublicContent } from "@/features/content/hooks/use-public-content"
import type { PublicContent } from "@/services/queries/catalog"

/** Travel inspiration: one feature article and a reading list. */
export function JournalSpread({ initialContent }: { initialContent: PublicContent }) {
  const { articles } = usePublicContent(initialContent)
  const [lead, ...rest] = articles
  if (!lead) return null
  return (
    <section aria-labelledby="jurnal-terbaru" className="border-t border-border bg-ivory-100/60 py-20 md:py-28">
      <div className="container-page">
        <SectionHeading
          id="jurnal-terbaru"
          eyebrow="Jurnal"
          title="Bekal sebelum berangkat"
          description="Panduan musim, tips persiapan, dan cerita dari perjalanan kami."
          link={{ href: "/jurnal", label: "Semua artikel" }}
        />
        <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-7">
            <ArticleCard article={lead} variant="feature" sizes="(min-width: 1024px) 58vw, 100vw" />
          </Reveal>
          <ul className="divide-y divide-border lg:col-span-5 lg:border-t lg:border-border">
            {rest.slice(0, 4).map((article, index) => (
              <li key={article.id} className="py-6 first:pt-0 lg:first:pt-6">
                <Reveal delay={index * 0.05}>
                  <ArticleCard article={article} variant="compact" />
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
