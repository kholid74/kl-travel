import type { Metadata } from "next"
import { Suspense } from "react"
import { PackageDetailFallback, PackageDetailRoute, PackageDetailSkeleton } from "@/features/packages/components/package-detail"
import { getSeedCatalog, getSeedCatalogPackages, getSeedSettings } from "@/services/catalog-server"

// Seed packages are prerendered; packages created in the dashboard render on request and
// resolve from the visitor's browser data (ADR-0003).
export function generateStaticParams() {
  return getSeedCatalogPackages().map((pkg) => ({ slug: pkg.slug }))
}

export async function generateMetadata({ params }: PageProps<"/paket/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const pkg = getSeedCatalogPackages().find((p) => p.slug === slug)
  return pkg ? { title: pkg.title, description: pkg.summary } : { title: "Paket wisata" }
}

export default function PackageDetailPage({ params }: PageProps<"/paket/[slug]">) {
  return (
    <Suspense fallback={<PackageDetailSkeleton />}>
      <PackageDetailContent params={params} />
    </Suspense>
  )
}

async function PackageDetailContent({ params }: { params: PageProps<"/paket/[slug]">["params"] }) {
  const { slug } = await params
  const props = { slug, initialCatalog: getSeedCatalog({ fullPackageSlug: slug }), initialSettings: getSeedSettings().booking }
  return (
    <Suspense fallback={<PackageDetailFallback {...props} />}>
      <PackageDetailRoute {...props} />
    </Suspense>
  )
}
