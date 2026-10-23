"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Download, Loader2 } from "lucide-react"
import { getMedia } from "@/data/media"
import { toDateOnlyWIB } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { TourPackage } from "@/domain/entities"
import { Button } from "@/components/ui/button"
import type { DepartureOption } from "@/services/queries/catalog"

const COVER = { width: 1400, height: 525 } // the PDF cover box is 2.67:1

/** Center-crops and downsizes the cover so the PDF stays light; null if it cannot load. */
async function coverForPdf(mediaId: string): Promise<{ dataUrl: string; credit: string } | undefined> {
  const media = getMedia(mediaId)
  if (!media) return undefined
  try {
    const image = new Image()
    image.src = media.src
    await image.decode()
    const scale = Math.max(COVER.width / image.naturalWidth, COVER.height / image.naturalHeight)
    const w = COVER.width / scale
    const h = COVER.height / scale
    const canvas = document.createElement("canvas")
    canvas.width = COVER.width
    canvas.height = COVER.height
    canvas.getContext("2d")?.drawImage(image, (image.naturalWidth - w) / 2, (image.naturalHeight - h) / 2, w, h, 0, 0, COVER.width, COVER.height)
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.82), credit: media.credit.photographer }
  } catch {
    return undefined
  }
}

/**
 * "Unduh itinerary (PDF)": builds the document in the browser on demand, so it also works
 * for packages created in the dashboard and reflects live departures and seats.
 */
export function ItineraryDownload({
  pkg,
  destinationName,
  regionLabel,
  options,
  selectedId,
  variant = "button",
  className,
}: {
  pkg: TourPackage
  destinationName: string
  regionLabel: string
  options: DepartureOption[] | null
  selectedId?: string
  variant?: "button" | "link"
  className?: string
}) {
  const [pending, setPending] = useState(false)

  const download = async () => {
    setPending(true)
    try {
      const [{ renderItineraryPdf }, cover] = await Promise.all([import("../itinerary-pdf"), coverForPdf(pkg.coverMediaId)])
      const departures = (options ?? [])
        .map((o) => ({ id: o.departure.id, startDate: o.departure.startDate, endDate: o.departure.endDate, pricePerPax: o.pricePerPax, available: o.seats.available, bookable: o.bookable }))
        .sort((a, b) => Number(b.bookable) - Number(a.bookable) || a.startDate.localeCompare(b.startDate))
      const blob = await renderItineraryPdf(
        {
          pkg,
          destinationName,
          regionLabel,
          cover,
          departures,
          selectedDepartureId: selectedId,
          url: `${window.location.origin}/paket/${pkg.slug}`,
          today: toDateOnlyWIB(new Date().toISOString()),
        },
        window.location.origin,
      )
      const href = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = href
      link.download = `itinerary-${pkg.slug}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(href), 10_000)
      toast.success("Itinerary diunduh", { description: `itinerary-${pkg.slug}.pdf` })
    } catch (error) {
      console.error(error)
      toast.error("Itinerary belum bisa dibuat", { description: "Periksa koneksi lalu coba lagi." })
    } finally {
      setPending(false)
    }
  }

  const icon = pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />
  const label = pending ? "Menyiapkan PDF…" : "Unduh itinerary (PDF)"

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={download}
        disabled={pending}
        aria-busy={pending || undefined}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-lagoon-700 underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70 [&_svg]:size-4",
          className,
        )}
      >
        {icon}
        {label}
      </button>
    )
  }
  return (
    <Button type="button" variant="secondary" onClick={download} disabled={pending} aria-busy={pending || undefined} className={className}>
      {icon}
      {label}
    </Button>
  )
}
