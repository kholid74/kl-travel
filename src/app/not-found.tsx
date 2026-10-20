import Link from "next/link"
import { Logo } from "@/components/shared/logo"
import { ThemeScope } from "@/components/theme-scope"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <ThemeScope scope="public" className="flex min-h-dvh flex-col bg-background">
      <div className="container-page flex h-16 items-center md:h-[72px]">
        <Link href="/" className="text-ocean-900" aria-label="Ke beranda">
          <Logo />
        </Link>
      </div>
      <main id="konten" className="container-page flex flex-1 flex-col items-start justify-center py-24">
        <p className="eyebrow text-lagoon-700">404</p>
        <h1 className="mt-3 max-w-2xl font-display text-display-lg text-ocean-900">Halaman ini belum ada di peta kami.</h1>
        <p className="mt-4 max-w-xl text-body-lg text-muted-foreground">
          Tautan mungkin sudah berubah, atau paket yang Anda cari sedang tidak dipublikasikan.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/">Kembali ke beranda</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/dashboard">Buka dashboard</Link>
          </Button>
        </div>
      </main>
    </ThemeScope>
  )
}
