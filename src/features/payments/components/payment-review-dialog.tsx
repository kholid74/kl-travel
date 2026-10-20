"use client"

import Link from "next/link"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { formatDateTime, formatIDR } from "@/lib/format"
import type { Settings, User } from "@/domain/entities"
import { PAYMENT_METHOD_LABEL } from "@/domain/labels"
import { useCommand } from "@/hooks/use-command"
import { usePersona } from "@/hooks/use-persona"
import { actorName } from "@/components/dashboard/activity-timeline"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { DemoNotice } from "@/components/shared/demo-notice"
import { Field } from "@/components/shared/field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { paymentCommands } from "@/services/payment-service"
import type { PaymentRow } from "@/services/queries/payments"

/** What verifying this payment changes, spelled out before finance commits. */
export function verificationEffect(row: PaymentRow): { tone: "success" | "warning"; text: string } | null {
  const { payment, booking, fin } = row
  if (!booking || !fin || payment.direction !== "in") return null
  if (booking.status === "cancelled") return { tone: "warning", text: "Booking sudah dibatalkan. Tolak pembayaran ini lalu proses sebagai refund." }
  if (payment.amount > fin.outstanding) return { tone: "warning", text: `Melebihi sisa tagihan ${formatIDR(fin.outstanding)}. Tolak dan minta pelanggan mengonfirmasi ulang.` }
  if (booking.status === "awaiting_payment" && fin.paidNet + payment.amount >= fin.firstInstallmentAmount) {
    return { tone: "success", text: "Menutup termin pertama: booking langsung terkonfirmasi dan kursi dialokasikan." }
  }
  if (fin.paidNet + payment.amount >= fin.total) return { tone: "success", text: "Melunasi booking." }
  return { tone: "success", text: `Sisa tagihan setelah verifikasi ${formatIDR(fin.outstanding - payment.amount)}.` }
}

/** Mock transfer receipt. The customer's upload is not stored; this stands in for it. */
function ProofIllustration({ row, bank }: { row: PaymentRow; bank: Settings["payment"]["bankAccountDisplay"] }) {
  return (
    <figure className="relative overflow-hidden rounded-md border border-dashed border-line-strong/60 bg-canvas px-4 py-3 text-xs">
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center text-4xl font-black tracking-[0.3em] text-text-strong/5 -rotate-12 select-none">
        CONTOH
      </span>
      <p className="font-semibold text-text-strong">Transfer berhasil</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 tabular-nums">
        <dt className="text-muted-foreground">Tujuan</dt>
        <dd>
          {bank.bank}
          <span className="block whitespace-nowrap">{bank.number}</span>
        </dd>
        <dt className="text-muted-foreground">Nominal</dt>
        <dd className="font-semibold">{formatIDR(row.payment.amount)}</dd>
        <dt className="text-muted-foreground">Waktu</dt>
        <dd>{formatDateTime(row.payment.paidAt)}</dd>
        <dt className="text-muted-foreground">Berita</dt>
        <dd>{row.booking?.code}</dd>
      </dl>
      <figcaption className="mt-2 text-[0.6875rem] text-muted-foreground">Ilustrasi bukti transfer. Situs demo tidak menyimpan file unggahan.</figcaption>
    </figure>
  )
}

export function PaymentReviewDialog({
  row,
  onOpenChange,
  users,
  bank,
}: {
  row: PaymentRow | null
  onOpenChange: (open: boolean) => void
  users: Record<string, User>
  bank: Settings["payment"]["bankAccountDisplay"]
}) {
  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{row && <Review key={row.payment.id} row={row} users={users} bank={bank} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  )
}

function Review({ row, users, bank, onDone }: { row: PaymentRow; users: Record<string, User>; bank: Settings["payment"]["bankAccountDisplay"]; onDone: () => void }) {
  const { user } = usePersona()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")
  const verify = useCommand(paymentCommands.verify, {
    success: (r) => (r.confirmed ? `Pembayaran diverifikasi · ${r.bookingCode} terkonfirmasi` : "Pembayaran diverifikasi"),
    onSuccess: onDone,
  })
  const reject = useCommand(paymentCommands.reject, { success: "Pembayaran ditolak", onSuccess: onDone })
  const { payment, booking, customer, fin } = row
  const effect = verificationEffect(row)
  const pending = verify.pending || reject.pending

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="text-base font-semibold">Tinjau pembayaran {payment.code}</DialogTitle>
        <DialogDescription>
          Cocokkan nominal dan waktu dengan mutasi rekening {bank.bank} sebelum memverifikasi.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <dl className="grid content-start gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Booking</dt>
            <dd>
              {booking ? (
                <Link href={`/dashboard/bookings/${booking.id}`} className="font-semibold text-text-strong hover:underline">
                  {booking.code}
                </Link>
              ) : (
                "—"
              )}{" "}
              · {customer?.fullName}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Nominal & metode</dt>
            <dd className="font-semibold text-text-strong tabular-nums">
              {formatIDR(payment.amount)} · {PAYMENT_METHOD_LABEL[payment.method]}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Dikirim oleh</dt>
            <dd>{payment.submittedBy.kind === "customer" ? `${customer?.fullName ?? "Pelanggan"} (website)` : actorName({ actor: payment.submittedBy }, users)}</dd>
          </div>
          {payment.reference && (
            <div>
              <dt className="text-xs text-muted-foreground">Referensi</dt>
              <dd>{payment.reference}</dd>
            </div>
          )}
          {fin && (
            <div>
              <dt className="text-xs text-muted-foreground">Tagihan booking</dt>
              <dd className="tabular-nums">
                {formatIDR(fin.paidNet)} dari {formatIDR(fin.total)} diterima
              </dd>
            </div>
          )}
        </dl>
        {payment.proofMediaId ? (
          <ProofIllustration row={row} bank={bank} />
        ) : (
          <p className="rounded-md bg-canvas px-4 py-3 text-xs text-muted-foreground">Dicatat oleh tim tanpa bukti unggahan. {payment.note}</p>
        )}
      </div>

      {effect && (
        <p className={effect.tone === "success" ? "rounded-md bg-tone-success-bg px-3 py-2 text-sm text-tone-success" : "rounded-md bg-tone-warning-bg px-3 py-2 text-sm text-tone-warning"}>{effect.text}</p>
      )}

      {rejecting && (
        <Field label="Alasan penolakan" description="Dicatat di riwayat booking. Di versi produksi, pelanggan menerima pesan ini.">
          {(c) => <Textarea {...c} rows={2} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: nominal tidak ditemukan di mutasi rekening" />}
        </Field>
      )}
      <DemoNotice>Simulasi: verifikasi meniru pengecekan mutasi rekening secara manual. Tidak ada payment gateway.</DemoNotice>

      <DialogFooter className="gap-2">
        {rejecting ? (
          <>
            <Button variant="ghost" onClick={() => setRejecting(false)} disabled={pending}>
              Kembali
            </Button>
            <Button variant="destructive" onClick={() => reject.run(user?.id ?? "", payment.id, reason)} disabled={pending || !reason.trim()}>
              {reject.pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Tolak pembayaran
            </Button>
          </>
        ) : (
          <>
            <PermissionButton permission="payments.verify" variant="ghost" className="text-tone-danger hover:bg-tone-danger-bg" onClick={() => setRejecting(true)} disabled={pending}>
              Tolak…
            </PermissionButton>
            <PermissionButton
              permission="payments.verify"
              disabledReason={effect?.tone === "warning" ? effect.text : null}
              onClick={() => verify.run(user?.id ?? "", payment.id)}
              disabled={pending}
            >
              {verify.pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Verifikasi
            </PermissionButton>
          </>
        )}
      </DialogFooter>
    </div>
  )
}
