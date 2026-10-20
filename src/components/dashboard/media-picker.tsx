"use client"

import { useState } from "react"
import { Check, Star } from "lucide-react"
import { listMedia } from "@/data/media"
import { cn } from "@/lib/utils"
import { ChipToggle } from "@/components/shared/choice"
import { SmartImage } from "@/components/shared/smart-image"

/**
 * Picks a cover and gallery from the static photo catalogue (no uploads in the demo:
 * images never go into browser storage).
 */
export function MediaPicker({
  cover,
  gallery,
  onChange,
  groups,
  initialGroup,
}: {
  cover: string
  gallery: string[]
  onChange: (next: { cover: string; gallery: string[] }) => void
  /** Tag filters, e.g. destination slugs. */
  groups: { tag: string; label: string }[]
  initialGroup?: string
}) {
  const [group, setGroup] = useState(initialGroup ?? "")
  const media = listMedia(group || undefined)

  const toggle = (id: string) => {
    if (id === cover) return
    onChange({ cover, gallery: gallery.includes(id) ? gallery.filter((g) => g !== id) : [...gallery, id] })
  }
  const makeCover = (id: string) => onChange({ cover: id, gallery: gallery.filter((g) => g !== id) })

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter foto">
        <ChipToggle pressed={!group} onPressedChange={() => setGroup("")}>
          Semua
        </ChipToggle>
        {groups.map((g) => (
          <ChipToggle key={g.tag} pressed={group === g.tag} onPressedChange={() => setGroup(g.tag)}>
            {g.label}
          </ChipToggle>
        ))}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Klik foto untuk menambah atau melepas dari galeri. Tombol bintang menjadikannya foto sampul. Terpilih: sampul + {gallery.length} foto galeri.
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {media.map((asset) => {
          const isCover = asset.id === cover
          const inGallery = gallery.includes(asset.id)
          return (
            <li key={asset.id} className="relative">
              <button
                type="button"
                onClick={() => toggle(asset.id)}
                aria-pressed={isCover || inGallery}
                aria-label={`${asset.alt}${isCover ? " (sampul)" : inGallery ? " (di galeri)" : ""}`}
                className={cn(
                  "relative block aspect-[4/3] w-full overflow-hidden rounded-md bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  (isCover || inGallery) && "ring-2 ring-ocean-800 ring-offset-2",
                )}
              >
                <SmartImage mediaId={asset.id} fill sizes="200px" alt="" />
                {(isCover || inGallery) && (
                  <span className="absolute top-2 left-2 flex size-6 items-center justify-center rounded-full bg-ocean-800 text-white">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                )}
                {isCover && <span className="absolute bottom-2 left-2 rounded-sm bg-ocean-950/80 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-ivory-50">Sampul</span>}
              </button>
              <button
                type="button"
                onClick={() => makeCover(asset.id)}
                aria-label={`Jadikan sampul: ${asset.alt}`}
                className={cn(
                  "absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-white/90 shadow-sm outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-ring",
                  isCover ? "text-sand-600" : "text-text-muted",
                )}
              >
                <Star className={cn("size-3.5", isCover && "fill-current")} aria-hidden="true" />
              </button>
              <p className="mt-1 truncate text-[0.6875rem] text-text-subtle">{asset.credit.photographer}</p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
