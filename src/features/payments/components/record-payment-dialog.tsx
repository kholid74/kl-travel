"use client"

import { useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { formatIDR } from "@/lib/format"
import type { PaymentMethod } from "@/domain/entities"
import { PAYMENT_METHOD_LABEL } from "@/domain/labels"
import { useCommand } from "@/hooks/use-command"
import { useLive } from "@/hooks/use-live"
import { usePersona } from "@/hooks/use-persona"
import { DemoNotice } from "@/components/shared/demo-notice"
import { Field } from "@/components/shared/field"
import { MoneyInput } from "@/components/shared/money-input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { paymentCommands } from "@/services/payment-service"
import { bookingRows } from "@/services/queries/bookings"

const METHODS = Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]

/**
 * Manual payment entry (transfer seen in the bank statement, cash at the office). Without a
 * fixed booking it offers every invoiced booking that still has an unrecorded balance.
 */
export function RecordPaymentDialog({ open, onOpenChange, bookingId }: { open: boolean; onOpenChange: (open: boolean) => void; bookingId?: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <RecordPaymentForm fixedBookingId={bookingId} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  )
}

function RecordPaymentForm({ fixedBookingId, onDone }: { fixedBookingId?: string; onDone: () => void }) {
  const live = useLive()
  const { user, can } = usePersona()
  const canVerify = can("payments.verify")
  const candidates = useMemo(() => {
    if (!live) return []
    return bookingRows(live.db, live.today)
      .filter((r) => (r.booking.status === "awaiting_payment" || r.booking.status === "confirmed") && r.fin.outstanding - r.fin.pendingVerificationAmount > 0)
      .sort((a, b) => (a.fin.nextInstallment?.installment.dueDate ?? "").localeCompare(b.fin.nextInstallment?.installment.dueDate ?? ""))
  }, [live])

  const [bookingId, setBookingId] = useState(fixedBookingId ?? "")
  const row = candidates.find((r) => r.booking.id === bookingId)
  const open = row ? row.fin.outstanding - row.fin.pendingVerificationAmount : 0
  const suggested = row ? Math.min(open, row.fin.nextInstallment?.remaining ?? open) : 0
  const [amount, setAmount] = useState(suggested)
  const [method, setMethod] = useState<PaymentMethod>("transfer_bank")
  const [paidOn, setPaidOn] = useState(live?.today ?? "")
  const [reference, setReference] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string>()

  const record = useCommand(paymentCommands.record, {
    success: (r) => (r.confirmed ? `Pembayaran ${r.code} dicatat · booking terkonfirmasi` : r.verified ? `Pembayaran ${r.code} dicatat dan terverifikasi` : `Pembayaran ${r.code} masuk antrean verifikasi`),
    onSuccess: onDone,
  })

  if (!live) return null
  const confirms = row?.booking.status === "awaiting_payment" && canVerify && row.fin.paidNet + amount >= row.fin.firstInstallmentAmount

  const submit = async () => {
    if (!row) return setError("Pilih booking.")
    if (amount <= 0) return setError("Masukkan nominal pembayaran.")
    if (amount > open) return setError(`Maksimal ${formatIDR(open)}.`)
    setError(undefined)
    const result = await record.run(user?.id ?? "", { bookingId: row.booking.id, amount, method, paidOn, reference, note })
    if (!result.ok && result.error.field === "amount") setError(result.error.message)
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void submit()
      }}
      className="grid gap-4"
    >
      <DialogHeader>
        <DialogTitle className="text-base font-semibold">Catat pembayaran</DialogTitle>
        <DialogDescription>
          {canVerify ? "Anda memiliki izin verifikasi, jadi pembayaran langsung tercatat sebagai terverifikasi." : "Pembayaran masuk antrean verifikasi tim finance sebelum dihitung."}
        </DialogDescription>
      </DialogHeader>

      {fixedBookingId ? (
        row && (
          <p className="rounded-md bg-muted px-3 py-2.5 text-sm">
            <span className="font-semibold text-text-strong">{row.booking.code}</span> · {row.customer?.fullName}
          </p>
        )
      ) : (
        <Field label="Booking">
          {(c) => (
            <Select
              value={bookingId}
              onValueChange={(id) => {
                setBookingId(id)
                const next = candidates.find((r) => r.booking.id === id)
                if (next) setAmount(Math.min(next.fin.outstanding - next.fin.pendingVerificationAmount, next.fin.nextInstallment?.remaining ?? Infinity))
              }}
            >
              <SelectTrigger {...c} className="w-full">
                <SelectValue placeholder="Pilih booking yang ditagih" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((r) => (
                  <SelectItem key={r.booking.id} value={r.booking.id}>
                    {r.booking.code} · {r.customer?.fullName} · sisa {formatIDR(r.fin.outstanding - r.fin.pendingVerificationAmount)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      )}

      {row && (
        <dl className="grid grid-cols-3 gap-2 text-sm">
          {[
            { label: "Total", value: row.fin.total },
            { label: "Diterima", value: row.fin.paidNet },
            { label: "Belum tercatat", value: open },
          ].map((item) => (
            <div key={item.label} className="rounded-md bg-canvas px-3 py-2">
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="font-semibold text-text-strong tabular-nums">{formatIDR(item.value)}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nominal" error={error}>
          {(c) => <MoneyInput {...c} value={amount} onChange={setAmount} />}
        </Field>
        <Field label="Metode">
          {(c) => (
            <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
              <SelectTrigger {...c} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      </div>
      {row && (
        <div className="-mt-2 flex flex-wrap gap-2">
          {row.fin.nextInstallment && row.fin.nextInstallment.remaining < open && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setAmount(row.fin.nextInstallment!.remaining)}>
              {row.fin.nextInstallment.installment.label} · {formatIDR(row.fin.nextInstallment.remaining)}
            </Button>
          )}
          <Button type="button" variant="secondary" size="sm" onClick={() => setAmount(open)}>
            Lunasi · {formatIDR(open)}
          </Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tanggal bayar">{(c) => <Input {...c} type="date" max={live.today} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} required />}</Field>
        <Field label="Referensi" optional>
          {(c) => <Input {...c} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="No. mutasi / kuitansi" />}
        </Field>
      </div>
      <Field label="Catatan" optional>
        {(c) => <Textarea {...c} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}
      </Field>

      {confirms && <p className="rounded-md bg-tone-success-bg px-3 py-2 text-sm text-tone-success">Nominal ini menutup termin pertama, jadi booking langsung terkonfirmasi.</p>}
      <DemoNotice>Simulasi: tidak ada dana yang berpindah. Pencatatan meniru pengecekan mutasi rekening secara manual.</DemoNotice>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone} disabled={record.pending}>
          Batal
        </Button>
        <Button type="submit" disabled={record.pending || !row}>
          {record.pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Catat pembayaran
        </Button>
      </DialogFooter>
    </form>
  )
}
