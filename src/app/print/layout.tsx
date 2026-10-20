import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = { title: "Cetak" }

/** Bare layout for print documents: no site or dashboard chrome (docs/route-map.md §3). */
export default function PrintLayout({ children }: { children: ReactNode }) {
  return (
    <main id="konten" className="min-h-screen bg-canvas print:bg-white">
      {children}
    </main>
  )
}
