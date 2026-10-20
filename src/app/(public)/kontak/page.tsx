import type { Metadata } from "next"
import { Suspense } from "react"
import { ContactPageFallback, ContactPageRoute } from "@/features/inquiries/components/contact-page"
import { getSeedCatalog, getSeedContent } from "@/services/catalog-server"

export const metadata: Metadata = {
  title: "Kontak",
  description: "Tanyakan jadwal, tingkat kesulitan, atau perlengkapan perjalanan kepada tim NusaVista Journey.",
}

export default function ContactPage() {
  const props = { initialContent: getSeedContent(), initialCatalog: getSeedCatalog() }
  return (
    <Suspense fallback={<ContactPageFallback {...props} />}>
      <ContactPageRoute {...props} />
    </Suspense>
  )
}
