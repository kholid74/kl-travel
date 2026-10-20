"use client"

import { useState } from "react"
import type { Booking, CancellationReason, Departure, TourPackage } from "@/domain/entities"
import { cancellationQuote } from "@/domain/rules/cancellation"
import type { BookingFinancials } from "@/domain/rules/payment-status"
import { formatIDR } from "@/lib/format"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { Field } from "@/components/shared/field"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { useCommand } from "@/hooks/use-command"
import { bookingCommands } from "@/services/booking-admin-service"

const REASONS: { value: Extract<CancellationReason, "customer_request" | "other">; label: string }[] = [
  { value: "customer_request", label: "Permintaan pelanggan" },
  { value: "other", label: "Lainnya" },
]

/**
 * Cancellation simulation: shows the policy tier, fee, and refund before anything changes
 * (docs/domain-model.md §6.6).
 */
export function CancelBookingDialog({
  open,
  onOpenChange,
  userId,
  booking,
  departure,
  pkg,
  fin,
  today,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  booking: Booking
  departure: Departure
  pkg: TourPackage
  fin: BookingFinancials
  today: string
}) {
  const [reason, setReason] = useState<(typeof REASONS)[number]["value"]>("customer_request")
  const [note, setNote] = useState("")
  const cancel = useCommand(bookingCommands.cancel, { success: `Booking ${booking.code} dibatalkan`, onSuccess: () => onOpenChange(false) })
  const quote = cancellationQuote({
    status: booking.status,
    reason,
    total: fin.total,
    paidNet: fin.paidNet,
    departureStart: departure.startDate,
    today,
    policy: pkg.cancellationPolicy,
  })

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Batalkan booking ${booking.code}?`}
      description="Kursi langsung dilepas dan invoice dibatalkan. Tindakan ini tidak bisa diurungkan."
      confirmLabel="Batalkan booking"
      tone="destructive"
      pending={cancel.pending}
      onConfirm={() => cancel.run(userId, booking.id, { reason, note })}
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label>Alasan</Label>
          <RadioGroup value={reason} onValueChange={(value) => setReason(value as typeof reason)} className="flex gap-5">
            {REASONS.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={option.value} /> {option.label}
              </label>
            ))}
          </RadioGroup>
        </div>
        <Field label="Catatan" optional>
          {(c) => <Textarea {...c} value={note} onChange={(event) => setNote(event.target.value)} rows={2} />}
        </Field>
        <dl className="grid grid-cols-2 gap-y-1.5 rounded-md bg-muted px-4 py-3 text-sm">
          <dt className="text-muted-foreground">Jarak ke keberangkatan</dt>
          <dd className="text-right font-medium tabular-nums">{quote.daysBefore} hari</dd>
          <dt className="text-muted-foreground">Biaya pembatalan</dt>
          <dd className="text-right font-medium tabular-nums">
            {quote.waived ? "Tidak dikenakan" : `${quote.feePercent}% · ${formatIDR(quote.fee)}`}
          </dd>
          <dt className="text-muted-foreground">Sudah dibayar</dt>
          <dd className="text-right font-medium tabular-nums">{formatIDR(fin.paidNet)}</dd>
          <dt className="font-semibold">Refund ke pelanggan</dt>
          <dd className="text-right font-semibold tabular-nums">{formatIDR(quote.refund)}</dd>
        </dl>
        <p className="text-xs text-muted-foreground">
          {quote.waived
            ? "Booking belum terkonfirmasi, jadi tidak ada biaya pembatalan."
            : `Kebijakan paket: dibatalkan ${quote.daysBefore} hari sebelum berangkat dikenakan ${quote.feePercent}% dari total ${formatIDR(fin.total)}.`}{" "}
          Refund dicatat oleh tim finance di modul Pembayaran.
        </p>
      </div>
    </ConfirmDialog>
  )
}
