import type { Metadata } from "next"
import { Suspense } from "react"
import { JournalIndexFallback, JournalIndexRoute } from "@/features/content/components/journal-index"
import { getSeedContent } from "@/services/catalog-server"

export const metadata: Metadata = {
  title: "Jurnal",
  description: "Panduan musim, tips persiapan, dan inspirasi perjalanan ke destinasi Nusantara.",
}

export default function JournalPage() {
  const content = getSeedContent()
  return (
    <>
      <header className="container-page pt-12 pb-10 md:pt-16 md:pb-12">
        <p className="eyebrow text-lagoon-700">Jurnal</p>
        <h1 className="mt-3 max-w-3xl font-display text-display-lg text-balance text-ocean-900">Bekal sebelum berangkat</h1>
        <p className="mt-4 max-w-2xl text-body-lg text-muted-foreground">
          Kapan waktu terbaik berkunjung, apa yang perlu dibawa, dan cara menikmati setiap destinasi dengan lebih tenang.
        </p>
      </header>
      <Suspense fallback={<JournalIndexFallback initialContent={content} />}>
        <JournalIndexRoute initialContent={content} />
      </Suspense>
    </>
  )
}
