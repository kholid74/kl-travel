"use client"

import Link from "next/link"
import { FaqList } from "@/components/public/faq-list"
import { usePublicContent } from "@/features/content/hooks/use-public-content"
import type { PublicContent } from "@/services/queries/catalog"

export function HomeFaq({ initialContent }: { initialContent: PublicContent }) {
  const { siteContent } = usePublicContent(initialContent)
  if (siteContent.homepageFaqs.length === 0) return null
  return (
    <section aria-labelledby="faq" className="py-20 md:py-28">
      <div className="container-page grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <p className="eyebrow text-lagoon-700">Pertanyaan umum</p>
            <h2 id="faq" className="mt-3 font-display text-display-md text-balance text-ocean-900">
              Sebelum Anda memesan
            </h2>
            <p className="mt-4 text-muted-foreground">
              Tidak menemukan jawabannya?{" "}
              <Link href="/kontak" className="font-semibold text-lagoon-700 underline underline-offset-4">
                Tanyakan langsung kepada kami
              </Link>
              .
            </p>
          </div>
        </div>
        <FaqList faqs={siteContent.homepageFaqs} className="lg:col-span-8" />
      </div>
    </section>
  )
}
