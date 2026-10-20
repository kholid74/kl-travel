"use client"

import { useState } from "react"
import { Check, ImageIcon } from "lucide-react"
import { getMedia, listMedia } from "@/data/media"
import { cn } from "@/lib/utils"
import { ChipToggle } from "@/components/shared/choice"
import { SmartImage } from "@/components/shared/smart-image"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/**
 * One photo from the static catalogue: a thumbnail with "Ganti foto", and the grid in a
 * dialog so long pages stay short. No uploads in the demo.
 */
export function PhotoField({
  value,
  onChange,
  groups,
  label,
  aspect = "aspect-[16/9]",
}: {
  value: string
  onChange: (mediaId: string) => void
  groups: { tag: string; label: string }[]
  label: string
  aspect?: string
}) {
  const [open, setOpen] = useState(false)
  const [group, setGroup] = useState("")
  const media = listMedia(group || undefined)
  const current = value ? getMedia(value) : undefined

  return (
    <div className="grid gap-2">
      <div className={cn("relative w-full max-w-sm overflow-hidden rounded-md border border-line bg-muted", aspect)}>
        {current ? (
          <SmartImage mediaId={current.id} fill sizes="384px" />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs text-text-subtle">
            <ImageIcon className="size-5" aria-hidden="true" /> Belum ada foto
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)} aria-label={`${current ? "Ganti" : "Pilih"} ${label.charAt(0).toLowerCase()}${label.slice(1)}`}>
          {current ? "Ganti foto" : "Pilih foto"}
        </Button>
        {current && <span className="truncate text-xs text-text-subtle">Foto: {current.credit.photographer}</span>}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{label}</DialogTitle>
            <DialogDescription>Pilih dari katalog foto showcase (Unsplash). Situs demo tidak menerima unggahan.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter foto">
            <ChipToggle pressed={!group} onPressedChange={() => setGroup("")}>
              Semua
            </ChipToggle>
            {groups.map((g) => (
              <ChipToggle key={g.tag} pressed={group === g.tag} onPressedChange={() => setGroup(g.tag)}>
                {g.label}
              </ChipToggle>
            ))}
          </div>
          <ul role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {media.map((asset) => {
              const selected = asset.id === value
              return (
                <li key={asset.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={asset.alt}
                    onClick={() => {
                      onChange(asset.id)
                      setOpen(false)
                    }}
                    className={cn(
                      "relative block aspect-[4/3] w-full overflow-hidden rounded-md bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      selected && "ring-2 ring-ocean-800 ring-offset-2",
                    )}
                  >
                    <SmartImage mediaId={asset.id} fill sizes="240px" alt="" />
                    {selected && (
                      <span className="absolute top-2 left-2 flex size-6 items-center justify-center rounded-full bg-ocean-800 text-white">
                        <Check className="size-3.5" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                  <p className="mt-1 truncate text-[0.6875rem] text-text-subtle">{asset.credit.photographer}</p>
                </li>
              )
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  )
}
