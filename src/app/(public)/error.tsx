"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function PublicError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="container-page flex min-h-[60vh] flex-col items-start justify-center py-24">
      <p className="eyebrow text-lagoon-700">Terjadi kendala</p>
      <h1 className="mt-3 max-w-2xl font-display text-display-md text-ocean-900">Halaman ini tidak dapat ditampilkan.</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">Silakan coba lagi. Bila masalah berlanjut, reset data demo dari tombol Demo di pojok kiri bawah.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={reset}>Coba lagi</Button>
        <Button asChild variant="secondary">
          <Link href="/">Ke beranda</Link>
        </Button>
      </div>
    </section>
  )
}
