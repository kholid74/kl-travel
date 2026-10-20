import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { PhotoCredit, SmartImage } from "@/components/shared/smart-image"
import { Button } from "@/components/ui/button"

/** Final call to action over a full-bleed photo: one primary button, one quiet link. */
export function ClosingCta({
  mediaId = "img-ra-karst-aerial",
  title = "Ke mana Anda ingin pergi berikutnya?",
  body = "Ceritakan rencana Anda, atau pilih jadwal open trip yang sudah tersedia. Tim kami membantu menyusun sisanya.",
}: {
  mediaId?: string
  title?: string
  body?: string
}) {
  return (
    <section className="relative isolate overflow-hidden bg-ocean-950 text-ivory-50">
      <SmartImage mediaId={mediaId} fill sizes="100vw" className="-z-20" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-ocean-950/55" />
      <div className="container-page flex min-h-[520px] flex-col items-start justify-end py-16 md:min-h-[600px] md:py-24">
        <h2 className="max-w-3xl font-display text-display-lg text-balance">{title}</h2>
        <p className="mt-5 max-w-xl text-body-lg text-ivory-50/85">{body}</p>
        <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
          <Button asChild size="xl" variant="sand">
            <Link href="/custom-trip">Rancang custom trip</Link>
          </Button>
          <Link
            href="/paket?jenis=open&urut=terdekat"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold underline decoration-ivory-50/40 underline-offset-[6px] hover:decoration-ivory-50"
          >
            Lihat jadwal open trip <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
        <PhotoCredit mediaId={mediaId} className="mt-12 text-ivory-50/60" />
      </div>
    </section>
  )
}
