"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import type { PaymentMethod } from "@/domain/entities"
import { PAYMENT_METHOD_LABEL } from "@/domain/labels"
import { formatIDR, formatNumber } from "@/lib/format"
import { DemoNotice } from "@/components/shared/demo-notice"
import { Field } from "@/components/shared/field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { submitPaymentConfirmation } from "@/services/booking-service"

const CUSTOMER_METHODS: PaymentMethod[] = ["transfer_bank", "virtual_account", "qris"]

function schemaFor(max: number) {
  return z.object({
    amount: z
      .number({ error: "Masukkan nominal." })
      .int()
      .min(10_000, "Nominal minimal Rp10.000.")
      .max(max, `Maksimal ${formatIDR(max)}, sisa tagihan yang belum dikonfirmasi.`),
    method: z.enum(["transfer_bank", "virtual_account", "qris"]),
    senderName: z.string().trim().min(3, "Isi nama pengirim."),
  })
}

type Values = z.infer<ReturnType<typeof schemaFor>>

/**
 * "Saya sudah transfer": records a payment waiting for finance verification.
 * Nothing is charged and no proof file is uploaded.
 */
export function PaymentConfirmationDialog({
  bookingId,
  suggestedAmount,
  maxAmount,
  defaultSender,
}: {
  bookingId: string
  suggestedAmount: number
  maxAmount: number
  defaultSender: string
}) {
  const [open, setOpen] = useState(false)
  const form = useForm<Values>({
    resolver: zodResolver(schemaFor(maxAmount)),
    values: { amount: suggestedAmount, method: "transfer_bank", senderName: defaultSender },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await submitPaymentConfirmation({ bookingId, ...values })
    if (!result.ok) {
      toast.error("Konfirmasi belum terkirim", { description: result.error.message })
      return
    }
    toast.success("Konfirmasi pembayaran terkirim", { description: "Tim finance akan memverifikasi pembayaran Anda (simulasi)." })
    setOpen(false)
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">Konfirmasi pembayaran (simulasi)</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Konfirmasi pembayaran</DialogTitle>
            <DialogDescription>Beri tahu kami pembayaran yang sudah Anda lakukan. Tim finance memverifikasinya secara manual.</DialogDescription>
          </DialogHeader>
          <DemoNotice>Simulasi: tidak ada uang yang ditransfer dan tidak ada file yang diunggah.</DemoNotice>
          <Field label="Nominal" error={errors.amount?.message} description={`Sisa tagihan yang belum dikonfirmasi: ${formatIDR(maxAmount)}`}>
            {(c) => (
              <Controller
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                    <Input
                      {...c}
                      inputMode="numeric"
                      className="pl-9 tabular-nums"
                      value={field.value ? formatNumber(field.value) : ""}
                      onChange={(event) => field.onChange(Number(event.target.value.replace(/\D/g, "")) || 0)}
                      onBlur={field.onBlur}
                    />
                  </div>
                )}
              />
            )}
          </Field>
          <Field label="Metode" error={errors.method?.message}>
            {(c) => (
              <Controller
                control={form.control}
                name="method"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id={c.id} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {PAYMENT_METHOD_LABEL[method]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </Field>
          <Field label="Nama pengirim" error={errors.senderName?.message}>
            {(c) => <Input {...c} {...form.register("senderName")} />}
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
              Kirim konfirmasi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
