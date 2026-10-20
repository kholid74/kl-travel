import type { Metadata } from "next"
import { ClosingCta } from "@/components/public/closing-cta"
import { AboutView } from "@/features/content/components/about-view"
import { getSeedCatalog, getSeedContent } from "@/services/catalog-server"

export const metadata: Metadata = {
  title: "Tentang kami",
  description: "Operator perjalanan Nusantara dengan grup kecil, perencanaan yang rapi, dan informasi yang jujur sejak awal.",
}

export default function AboutPage() {
  return (
    <>
      <AboutView initialContent={getSeedContent()} initialCatalog={getSeedCatalog()} />
      <ClosingCta mediaId="img-blt-granite-sea" title="Mari rencanakan perjalanan berikutnya" />
    </>
  )
}
