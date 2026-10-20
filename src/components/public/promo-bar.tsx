"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"
import { X } from "lucide-react"
import type { SiteContent } from "@/domain/entities"
import { useDbStore } from "@/stores/db-store"

const DISMISS_KEY = "nusavista-demo:promo-dismissed"

// Per-session dismissal, exposed as an external store so server and client agree on first render.
const listeners = new Set<() => void>()
let memoryDismissed: string | null = null

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function readDismissed(): string | null {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) ?? memoryDismissed
  } catch {
    return memoryDismissed
  }
}

function writeDismissed(message: string) {
  memoryDismissed = message
  try {
    window.sessionStorage.setItem(DISMISS_KEY, message)
  } catch {
    // session-only convenience
  }
  for (const listener of listeners) listener()
}

/** Announcement bar driven by Site Content; the server renders the seed value (ADR-0003). */
export function PromoBar({ initial }: { initial: SiteContent["promoBanner"] }) {
  const live = useDbStore((state) => state.db?.siteContent.promoBanner)
  const banner = live ?? initial
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => null)

  if (!banner.enabled || dismissed === banner.message) return null

  return (
    <div className="relative bg-ocean-950 text-ivory-50">
      <div className="container-page flex min-h-10 items-center justify-center py-2 pr-10 text-center text-[0.8125rem]">
        <p>
          {banner.message}
          {banner.linkHref && banner.linkLabel && (
            <>
              {" "}
              <Link href={banner.linkHref} className="font-semibold text-sand-300 underline underline-offset-4">
                {banner.linkLabel}
              </Link>
            </>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={() => writeDismissed(banner.message)}
        className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-ivory-50/70 hover:text-ivory-50"
        aria-label="Tutup pengumuman"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
