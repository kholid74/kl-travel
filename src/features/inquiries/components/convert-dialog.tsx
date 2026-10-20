"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import type { DemoDatabase } from "@/domain/database"
import type { Inquiry, Quotation } from "@/domain/entities"
import { priceTotal } from "@/domain/rules/pricing"
import { formatDateRange, formatIDR } from "@/lib/format"
import { addDays } from "@/lib/dates"
import { useCommand } from "@/hooks/use-command"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { inquiryCommands } from "@/services/inquiry-admin-service"
import { upcomingDepartures } from "@/services/queries/catalog"

/**
 * Won inquiry → booking (§6.7). Private and custom trips use the accepted quotation and get
 * their own departure; a general question joins a scheduled departure with enough seats.
 */
export function ConvertDialog({
  open,
  onOpenChange,
  db,
  now,
  inquiry,
  accepted,
  userId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  db: DemoDatabase
  now: string
  inquiry: Inquiry
  accepted?: Quotation
  userId: string
}) {
  const router = useRouter()
  const [departureId, setDepartureId] = useState("")
  const convert = useCommand(inquiryCommands.convert, {
    success: (r) => `Booking ${r.code} dibuat, invoice diterbitkan`,
    onSuccess: (r) => router.push(`/dashboard/bookings/${r.bookingId}`),
  })
  const general = inquiry.type === "general"
  const options = general
    ? upcomingDepartures(db, now, 200).filter((o) => o.seats.available >= inquiry.groupSize && (!inquiry.packageId || o.pkg.id === inquiry.packageId))
    : []

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Konversi ${inquiry.code} menjadi booking?`}
      description="Booking dibuat atas nama pelanggan yang sama, langsung berstatus Menunggu Pembayaran dengan invoice."
      confirmLabel="Buat booking"
      pending={convert.pending}
      confirmDisabled={general ? !departureId : !accepted}
      onConfirm={() => convert.run(userId, inquiry.id, general ? { departureId } : {})}
    >
      {general ? (
        <div className="grid gap-2">
          <Label htmlFor="konversi-jadwal">Jadwal open trip untuk {inquiry.groupSize} orang</Label>
          {options.length === 0 ? (
            <p className="text-sm text-tone-danger">Tidak ada jadwal dengan sisa kursi yang cukup.</p>
          ) : (
            <Select value={departureId} onValueChange={setDepartureId}>
              <SelectTrigger id="konversi-jadwal" className="w-full">
                <SelectValue placeholder="Pilih jadwal" />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.departure.id} value={o.departure.id}>
                    {o.pkg.title} · {formatDateRange(o.departure.startDate, o.departure.endDate)} · sisa {o.seats.available}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ) : accepted ? (
        <dl className="grid grid-cols-2 gap-y-1.5 rounded-md bg-muted px-4 py-3 text-sm">
          <dt className="text-muted-foreground">Penawaran</dt>
          <dd className="text-right font-medium">{accepted.code}</dd>
          <dt className="text-muted-foreground">Tanggal</dt>
          <dd className="text-right font-medium">{formatDateRange(accepted.proposedStartDate, addDays(accepted.proposedStartDate, accepted.durationDays - 1))}</dd>
          <dt className="text-muted-foreground">Peserta</dt>
          <dd className="text-right font-medium tabular-nums">{accepted.groupSize} orang</dd>
          <dt className="font-semibold">Total</dt>
          <dd className="text-right font-semibold tabular-nums">{formatIDR(priceTotal(accepted))}</dd>
          <dd className="col-span-2 mt-1 text-xs text-muted-foreground">
            {inquiry.type === "custom" ? "Paket custom (tidak tampil di katalog) dan keberangkatan privat dibuat otomatis." : "Keberangkatan privat dibuat otomatis untuk grup ini."}
          </dd>
        </dl>
      ) : (
        <p className="text-sm text-tone-danger">Belum ada penawaran yang disetujui.</p>
      )}
    </ConfirmDialog>
  )
}
