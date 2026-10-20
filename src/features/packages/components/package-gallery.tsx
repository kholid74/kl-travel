"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Images } from "lucide-react"
import { getMedia } from "@/data/media"
import { cn } from "@/lib/utils"
import { PhotoCredit, SmartImage } from "@/components/shared/smart-image"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

/**
 * Editorial gallery: one large photo and four smaller ones on desktop, a swipeable strip
 * on mobile. Any photo opens a keyboard-navigable lightbox.
 */
export function PackageGallery({ mediaIds, title, preloadFirst = true }: { mediaIds: string[]; title: string; preloadFirst?: boolean }) {
  const images = mediaIds.filter((id, index) => mediaIds.indexOf(id) === index && getMedia(id))
  const [open, setOpen] = useState<number | null>(null)
  const count = images.length
  if (count === 0) return null

  const show = (index: number) => setOpen((index + count) % count)
  const current = open !== null ? images[open] : null

  return (
    <>
      {/* One set of images for every breakpoint, so only the first photo is preloaded:
          a swipeable strip on mobile, 1 large + 4 small from md up. */}
      <div
        aria-label={`Galeri ${title}`}
        className="relative -mx-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 no-scrollbar md:mx-0 md:grid md:h-[min(64vh,560px)] md:grid-cols-4 md:grid-rows-2 md:overflow-visible md:px-0"
      >
        {images.map((id, index) => (
          <button
            key={id}
            type="button"
            onClick={() => setOpen(index)}
            className={cn(
              "group relative aspect-[4/3] w-[86%] shrink-0 snap-center overflow-hidden rounded-[2px] bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:aspect-auto md:w-auto",
              index === 0 && "md:col-span-2 md:row-span-2",
              index >= 5 && "md:hidden",
              count < 5 && index === count - 1 && index > 0 && "md:col-span-2",
            )}
            aria-label={`Buka foto ${index + 1} dari ${count}`}
          >
            <SmartImage
              mediaId={id}
              fill
              preload={preloadFirst && index === 0}
              loading={preloadFirst && index === 0 ? undefined : "lazy"}
              sizes={index === 0 ? "(min-width: 1280px) 640px, (min-width: 768px) 50vw, 86vw" : "(min-width: 1280px) 320px, (min-width: 768px) 25vw, 86vw"}
              className="transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.03]"
            />
            <span className="absolute right-2 bottom-2 rounded-sm bg-ocean-950/70 px-1.5 py-0.5 text-[0.6875rem] font-medium text-ivory-50 tabular-nums md:hidden">
              {index + 1}/{count}
            </span>
          </button>
        ))}
        {count > 1 && (
          <Button type="button" variant="inverse" size="sm" onClick={() => setOpen(0)} className="absolute right-3 bottom-3 hidden shadow-md md:inline-flex">
            <Images aria-hidden="true" /> Lihat {count} foto
          </Button>
        )}
      </div>

      <Dialog open={open !== null} onOpenChange={(value) => !value && setOpen(null)}>
        <DialogContent
          className="max-w-[min(1100px,calc(100%-2rem))] gap-0 overflow-hidden bg-ocean-950 p-0 text-ivory-50 ring-0 sm:max-w-[min(1100px,calc(100%-2rem))] [&_[data-slot=dialog-close]]:text-ivory-50 [&_[data-slot=dialog-close]]:hover:bg-ivory-50/10"
          onKeyDown={(event) => {
            if (open === null) return
            if (event.key === "ArrowRight") show(open + 1)
            if (event.key === "ArrowLeft") show(open - 1)
          }}
        >
          <DialogTitle className="sr-only">Galeri {title}</DialogTitle>
          <DialogDescription className="sr-only">Gunakan tombol panah kiri dan kanan untuk berpindah foto.</DialogDescription>
          {current && open !== null && (
            <figure>
              <div className="relative aspect-[3/2] max-h-[78vh] w-full">
                <SmartImage key={current} mediaId={current} fill sizes="(min-width: 1100px) 1100px, 100vw" className="object-contain" />
              </div>
              <figcaption className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-ivory-50/90">{getMedia(current)?.alt}</span>
                  <PhotoCredit mediaId={current} className="text-ivory-50/60" />
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-ivory-50/70 tabular-nums" aria-live="polite">
                    {open + 1} / {count}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => show(open - 1)} className="text-ivory-50 hover:bg-ivory-50/10" aria-label="Foto sebelumnya">
                    <ChevronLeft />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => show(open + 1)} className="text-ivory-50 hover:bg-ivory-50/10" aria-label="Foto berikutnya">
                    <ChevronRight />
                  </Button>
                </span>
              </figcaption>
            </figure>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
