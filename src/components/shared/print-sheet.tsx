"use client"

import type { ReactNode } from "react"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * One A4 sheet with an on-screen toolbar. The toolbar and the grey surround disappear when
 * printing; page size and margins come from the @page rule in globals.css.
 */
export function PrintSheet({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <div className="no-print sticky top-0 z-10 border-b border-line bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-strong">{title}</p>
            <p className="text-xs text-muted-foreground">Pratinjau cetak A4 · simpan sebagai PDF dari dialog cetak browser</p>
          </div>
          <Button onClick={() => window.print()}>
            <Printer aria-hidden="true" /> Cetak / simpan PDF
          </Button>
        </div>
      </div>
      <div className="mx-auto my-6 w-full max-w-[210mm] bg-white px-5 py-8 shadow-sm sm:px-[16mm] sm:py-[16mm] print:m-0 print:max-w-none print:p-0 print:shadow-none">
        {children}
      </div>
    </>
  )
}
