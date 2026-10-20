import type { Metadata } from "next"
import { Suspense } from "react"
import { DestinationDetail, DestinationDetailSkeleton } from "@/features/destinations/components/destination-detail"
import { getSeedCatalog, getSeedContent, getSeedDestinations } from "@/services/catalog-server"

export function generateStaticParams() {
  return getSeedDestinations().map((d) => ({ slug: d.slug }))
}

export async function generateMetadata({ params }: PageProps<"/destinasi/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const destination = getSeedDestinations().find((d) => d.slug === slug)
  return destination ? { title: destination.name, description: destination.summary } : { title: "Destinasi" }
}

export default function DestinationDetailPage({ params }: PageProps<"/destinasi/[slug]">) {
  return (
    <Suspense fallback={<DestinationDetailSkeleton />}>
      <DestinationDetailContent params={params} />
    </Suspense>
  )
}

async function DestinationDetailContent({ params }: { params: PageProps<"/destinasi/[slug]">["params"] }) {
  const { slug } = await params
  return <DestinationDetail slug={slug} initialCatalog={getSeedCatalog()} initialContent={getSeedContent()} />
}
