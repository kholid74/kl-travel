import type { Metadata } from "next"
import Link from "next/link"
import { NotFoundPanel } from "@/components/dashboard/page-skeleton"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Halaman tidak ditemukan" }

export default function DashboardNotFound() {
  return (
    <NotFoundPanel
      title="Halaman tidak ditemukan"
      description="Alamat ini tidak ada di dashboard. Pilih modul dari menu, atau kembali ke ringkasan."
      action={
        <Button asChild variant="secondary">
          <Link href="/dashboard">Kembali ke dashboard</Link>
        </Button>
      }
    />
  )
}
