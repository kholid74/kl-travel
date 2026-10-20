"use client"

import { useState } from "react"
import { formatIDR } from "@/lib/format"
import { CANCELLATION_REASON_LABEL } from "@/domain/labels"
import { useCommand } from "@/hooks/use-command"
import { usePersona } from "@/hooks/use-persona"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { DemoNotice } from "@/components/shared/demo-notice"
import { Field } from "@/components/shared/field"
import { MoneyInput } from "@/components/shared/money-input"
import { Input } from "@/components/ui/input"
import { paymentCommands } from "@/services/payment-service"
import type { BookingRow } from "@/services/queries/bookings"

/** Records money returned after a cancellation, capped at the refund the policy allowed. */
export function RefundDialog({ row, onOpenChange }: { row: BookingRow | null; onOpenChange: (open: boolean) => void }) {
  return row ? <RefundForm key={row.booking.id} row={row} onOpenChange={onOpenChange} /> : null
}

function RefundForm({ row, onOpenChange }: { row: BookingRow; onOpenChange: (open: boolean) => void }) {
  const { user } = usePersona()
  const remaining = row.fin.refundRemaining
  const [amount, setAmount] = useState(remaining)
  const [reference, setReference] = useState("")
  const refund = useCommand(paymentCommands.refund, { success: (r) => `Refund ${r.code} dicatat`, onSuccess: () => onOpenChange(false) })
  const cancellation = row.booking.cancellation
  const error = amount > remaining ? `Maksimal ${formatIDR(remaining)}.` : undefined

  return (
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title={`Catat refund ${row.booking.code}`}
      description={`${row.customer?.fullName ?? "Pelanggan"} · ${cancellation ? CANCELLATION_REASON_LABEL[cancellation.reason].toLowerCase() : "dibatalkan"}`}
      confirmLabel="Catat refund"
      pending={refund.pending}
      confirmDisabled={!!error || amount <= 0}
      onConfirm={() => refund.run(user?.id ?? "", { bookingId: row.booking.id, amount, reference })}
    >
      <div className="grid gap-4">
        <dl className="grid grid-cols-2 gap-y-1.5 rounded-md bg-muted px-4 py-3 text-sm">
          <dt className="text-muted-foreground">Sudah dibayar pelanggan</dt>
          <dd className="text-right tabular-nums">{formatIDR(row.fin.paidIn)}</dd>
          <dt className="text-muted-foreground">Biaya pembatalan</dt>
          <dd className="text-right tabular-nums">{formatIDR(cancellation?.feeAmount ?? 0)}</dd>
          <dt className="text-muted-foreground">Refund sesuai kebijakan</dt>
          <dd className="text-right tabular-nums">{formatIDR(row.fin.refundDue)}</dd>
          <dt className="font-semibold">Belum ditransfer</dt>
          <dd className="text-right font-semibold tabular-nums">{formatIDR(remaining)}</dd>
        </dl>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nominal refund" error={error} description="Bisa dicicil bila refund ditransfer bertahap.">
            {(c) => <MoneyInput {...c} value={amount} onChange={setAmount} />}
          </Field>
          <Field label="Referensi transfer" optional>
            {(c) => <Input {...c} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="No. bukti transfer" />}
          </Field>
        </div>
        <DemoNotice>Simulasi: tidak ada transfer sungguhan ke rekening pelanggan.</DemoNotice>
      </div>
    </ConfirmDialog>
  )
}
