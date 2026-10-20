"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { ExternalLink, HardDrive, RotateCcw } from "lucide-react"
import { formatDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { demoStatus, resetDemoData } from "@/services/demo-service"
import { useDbStore } from "@/stores/db-store"

/** Shared content of the public "Demo" launcher and the dashboard Demo Mode badge. */
export function DemoPanel({ context }: { context: "public" | "dashboard" }) {
  const db = useDbStore((state) => state.db)
  const persistent = useDbStore((state) => state.persistent)
  // The database only exists after hydration, so reading the clock here cannot cause a mismatch.
  const status = db ? demoStatus(db, new Date().toISOString()) : null
  const [open, setOpen] = useState(false)

  const reset = () => {
    resetDemoData()
    setOpen(false)
    toast.success("Data demo dikembalikan ke kondisi awal", { description: "Semua tanggal dihitung ulang dari hari ini." })
  }

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="font-semibold text-foreground">Mode demo</p>
        <p className="mt-1 text-muted-foreground">
          NusaVista Journey adalah brand fiktif untuk mendemokan website travel dan dashboard operasional. Booking, pembayaran, dan pesan
          hanya simulasi.
        </p>
      </div>

      <div className="rounded-md bg-muted px-3 py-2.5 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          <HardDrive className="size-3.5" aria-hidden="true" />
          {persistent ? "Data tersimpan di browser ini" : "Penyimpanan browser tidak tersedia"}
        </p>
        <p className="mt-1">
          {persistent
            ? "Perubahan bertahan setelah refresh, tetapi tidak tersinkron ke perangkat atau pengguna lain."
            : "Perubahan akan hilang setelah halaman dimuat ulang."}
        </p>
        {status && (
          <p className="mt-1">
            Data demo dibuat {formatDate(status.seedAnchor)}
            {status.stale && " — sudah lama, sebaiknya di-reset agar tanggal kembali relevan."}
            {status.outdated && " Versi data demo baru tersedia."}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        {context === "public" ? (
          <Button asChild variant="default">
            <Link href="/dashboard">Buka dashboard operasional</Link>
          </Button>
        ) : (
          <Button asChild variant="secondary">
            <Link href="/" target="_blank">
              Lihat website publik <ExternalLink aria-hidden="true" />
            </Link>
          </Button>
        )}
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" disabled={!db}>
              <RotateCcw aria-hidden="true" /> Reset data demo
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset data demo?</AlertDialogTitle>
              <AlertDialogDescription>
                Semua booking, inquiry, pembayaran, dan perubahan konten yang Anda buat di browser ini akan dihapus dan diganti data
                awal dengan tanggal yang dihitung dari hari ini.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={reset}>Reset data</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
