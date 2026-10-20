"use client"

import { Hero } from "@/components/public/hero"
import { TripSearch } from "@/components/public/trip-search"
import { usePublicContent } from "@/features/content/hooks/use-public-content"
import { usePublicCatalog } from "@/features/packages/hooks/use-public-catalog"
import type { PublicCatalog, PublicContent } from "@/services/queries/catalog"

export function HomeHero({ initialContent, initialCatalog }: { initialContent: PublicContent; initialCatalog: PublicCatalog }) {
  const { siteContent } = usePublicContent(initialContent)
  const { destinations } = usePublicCatalog(initialCatalog)
  return <Hero hero={siteContent.hero} search={<TripSearch destinations={destinations} />} />
}
