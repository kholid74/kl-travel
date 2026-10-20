"use client"

import { useState } from "react"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { addDays, diffDays } from "@/lib/dates"
import { formatIDR, formatNumber } from "@/lib/format"
import type { DemoDatabase } from "@/domain/database"
import type { Inquiry, Quotation } from "@/domain/entities"
import { tierFor } from "@/domain/rules/pricing"
import { useCommand } from "@/hooks/use-command"
import { usePersona } from "@/hooks/use-persona"
import { Field } from "@/components/shared/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { inquiryCommands } from "@/services/inquiry-admin-service"

const schema = z.object({
  title: z.string().trim().min(3, "Isi judul penawaran."),
  packageId: z.string(),
  proposedStartDate: z.string().min(1, "Pilih tanggal berangkat."),
  durationDays: z.number().int().min(1).max(30),
  groupSize: z.number().int().min(1).max(60),
  lines: z
    .array(z.object({ label: z.string().trim(), quantity: z.number().int().min(1, "Min. 1"), unitPrice: z.number().int().min(0) }))
    .refine((lines) => lines.some((line) => line.label), "Tambahkan minimal satu baris harga."),
  discount: z.number().int().min(0),
  itinerary: z.array(z.object({ text: z.string() })),
  validDays: z.number().int().min(1).max(60),
})

type Values = z.input<typeof schema>

function defaults(db: DemoDatabase, inquiry: Inquiry, base: Quotation | undefined, today: string): Values {
  if (base) {
    return {
      title: base.title,
      packageId: base.packageId ?? inquiry.packageId ?? "",
      proposedStartDate: base.proposedStartDate > today ? base.proposedStartDate : addDays(today, 30),
      durationDays: base.durationDays,
      groupSize: base.groupSize,
      lines: base.lines.map(({ label, quantity, unitPrice }) => ({ label, quantity, unitPrice })),
      discount: base.discount,
      itinerary: base.itinerarySummary.map((text) => ({ text })),
      validDays: 7,
    }
  }
  const pkg = inquiry.packageId ? db.packages[inquiry.packageId] : undefined
  const dates = inquiry.travelDates
  const start = dates.kind === "exact" ? dates.startDate : dates.kind === "range" ? dates.from : dates.month ? `${dates.month}-15` : addDays(today, 30)
  const duration = dates.kind === "range" ? diffDays(dates.to, dates.from) + 1 : (inquiry.durationDays ?? pkg?.durationDays ?? 3)
  const unit = pkg?.pricing.kind === "tiered" ? (tierFor(pkg.pricing.tiers, inquiry.groupSize)?.pricePerPax ?? 0) : pkg?.pricing.kind === "per_pax" ? pkg.pricing.pricePerPax : 0
  const destinationNames = inquiry.destinationIds.map((id) => db.destinations[id]?.name).filter(Boolean).join(" & ")
  return {
    title: pkg ? `${pkg.title} · ${inquiry.groupSize} pax` : `Custom ${destinationNames} · ${inquiry.groupSize} pax`,
    packageId: pkg?.id ?? "",
    proposedStartDate: start > today ? start : addDays(today, 30),
    durationDays: duration,
    groupSize: inquiry.groupSize,
    lines: [{ label: pkg ? `${pkg.title} (per orang)` : "Paket custom (per orang)", quantity: inquiry.groupSize, unitPrice: unit }],
    discount: 0,
    itinerary: inquiry.type === "custom" ? Array.from({ length: duration }, () => ({ text: "" })) : [],
    validDays: 7,
  }
}

/** Quotation editor in a sheet. Saving a sent quotation's revision creates a new version. */
export function QuotationBuilder({
  open,
  onOpenChange,
  db,
  inquiry,
  base,
  today,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  db: DemoDatabase
  inquiry: Inquiry
  /** Draft to edit, or a sent version to revise from. */
  base?: Quotation
  today: string
}) {
  const { user } = usePersona()
  const [intent, setIntent] = useState<"draft" | "send">("send")
  // Mounted fresh each time the sheet opens, so defaults are read once (see InquiryDetail).
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults(db, inquiry, base, today) })
  const { control, register, formState } = form
  const errors = formState.errors
  const lines = useFieldArray({ control, name: "lines" })
  const itinerary = useFieldArray({ control, name: "itinerary" })
  const [watchedLines, discount] = useWatch({ control, name: ["lines", "discount"] })
  const subtotal = watchedLines.reduce((sum, line) => sum + (line.quantity || 0) * (line.unitPrice || 0), 0)
  const save = useCommand(inquiryCommands.saveQuotation, {
    success: (q) => (q.status === "sent" ? `Penawaran ${q.code} dikirim (simulasi)` : `Draf ${q.code} disimpan`),
    onSuccess: () => onOpenChange(false),
  })
  const privatePackages = Object.values(db.packages).filter((p) => p.tripType === "private" && p.status !== "archived")

  const onSubmit = form.handleSubmit((v) => {
    if (!user) return
    void save.run(
      user.id,
      inquiry.id,
      {
        title: v.title,
        packageId: v.packageId || undefined,
        proposedStartDate: v.proposedStartDate,
        durationDays: v.durationDays,
        groupSize: v.groupSize,
        lines: v.lines.filter((line) => line.label),
        discount: v.discount,
        itinerarySummary: v.itinerary.map((d) => d.text),
        validDays: v.validDays,
      },
      { draftId: base?.status === "draft" ? base.id : undefined, send: intent === "send" },
    )
  })

  const money = (name: `lines.${number}.unitPrice` | "discount", label: string) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Input
          aria-label={label}
          inputMode="numeric"
          className="text-right tabular-nums"
          value={field.value ? formatNumber(field.value) : "0"}
          onChange={(event) => field.onChange(Number(event.target.value.replace(/\D/g, "")) || 0)}
          onBlur={field.onBlur}
        />
      )}
    />
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-line px-5 py-4">
          <SheetTitle className="text-base font-semibold">{base?.status === "draft" ? `Edit draf ${base.code}` : base ? `Revisi dari ${base.code}` : "Penawaran baru"}</SheetTitle>
          <SheetDescription>
            {inquiry.contactSnapshot.fullName} · {inquiry.groupSize} orang. Mengirim penawaran memindahkan inquiry ke tahap Penawaran Dikirim.
          </SheetDescription>
        </SheetHeader>
        <form
          // Sheets render in a portal but React events still bubble to an outer form.
          onSubmit={(event) => {
            event.stopPropagation()
            void onSubmit(event)
          }}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <Field label="Judul" error={errors.title?.message}>
              {(c) => <Input {...c} {...register("title")} />}
            </Field>
            {inquiry.type === "private" && (
              <Field label="Paket private trip">
                {(c) => (
                  <Controller
                    control={control}
                    name="packageId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id={c.id} className="w-full">
                          <SelectValue placeholder="Pilih paket" />
                        </SelectTrigger>
                        <SelectContent>
                          {privatePackages.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Tanggal berangkat" error={errors.proposedStartDate?.message} className="sm:col-span-2">
                {(c) => <Input {...c} type="date" min={addDays(today, 1)} {...register("proposedStartDate")} />}
              </Field>
              <Field label="Durasi (hari)">
                {(c) => <Input {...c} type="number" min={1} {...register("durationDays", { valueAsNumber: true })} />}
              </Field>
              <Field label="Peserta">
                {(c) => <Input {...c} type="number" min={1} {...register("groupSize", { valueAsNumber: true })} />}
              </Field>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium">Rincian harga</legend>
              <div className="space-y-2">
                {lines.fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_64px_128px_auto] items-start gap-2">
                    <Input aria-label={`Keterangan baris ${index + 1}`} placeholder="Keterangan" {...register(`lines.${index}.label`)} />
                    <Input aria-label={`Jumlah baris ${index + 1}`} type="number" min={1} className="text-right" {...register(`lines.${index}.quantity`, { valueAsNumber: true })} />
                    {money(`lines.${index}.unitPrice`, `Harga satuan baris ${index + 1}`)}
                    <Button type="button" variant="ghost" size="icon" onClick={() => lines.remove(index)} disabled={lines.fields.length === 1} aria-label={`Hapus baris ${index + 1}`}>
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
              {errors.lines?.root?.message && <p className="mt-1 text-xs text-destructive">{errors.lines.root.message}</p>}
              <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => lines.append({ label: "", quantity: 1, unitPrice: 0 })}>
                <Plus aria-hidden="true" /> Tambah baris
              </Button>
              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_200px] items-center gap-2 border-t border-line pt-3 text-sm">
                <span className="text-right text-muted-foreground">Subtotal</span>
                <span className="text-right tabular-nums">{formatIDR(subtotal)}</span>
                <span className="text-right text-muted-foreground">Diskon</span>
                {money("discount", "Diskon")}
                <span className="text-right font-semibold">Total</span>
                <span className="text-right font-semibold tabular-nums">{formatIDR(Math.max(0, subtotal - (discount || 0)))}</span>
              </div>
            </fieldset>

            {(inquiry.type === "custom" || itinerary.fields.length > 0) && (
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Ringkasan itinerary per hari{inquiry.type === "custom" && " (wajib)"}</legend>
                <ol className="space-y-2">
                  {itinerary.fields.map((field, index) => (
                    <li key={field.id} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-2">
                      <span className="text-xs font-semibold text-text-muted">Hari {index + 1}</span>
                      <Input aria-label={`Hari ${index + 1}`} {...register(`itinerary.${index}.text`)} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => itinerary.remove(index)} aria-label={`Hapus hari ${index + 1}`}>
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ol>
                <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => itinerary.append({ text: "" })}>
                  <Plus aria-hidden="true" /> Tambah hari
                </Button>
              </fieldset>
            )}

            <Field label="Berlaku (hari)" description="Lewat dari masa berlaku, penawaran ditandai Kedaluwarsa." className="max-w-40">
              {(c) => <Input {...c} type="number" min={1} {...register("validDays", { valueAsNumber: true })} />}
            </Field>
          </div>
          <SheetFooter className="flex-row justify-end gap-2 border-t border-line px-5 py-4">
            <Button type="submit" variant="secondary" disabled={save.pending} onClick={() => setIntent("draft")}>
              Simpan draf
            </Button>
            <Button type="submit" disabled={save.pending} onClick={() => setIntent("send")}>
              {save.pending && intent === "send" && <Loader2 className="animate-spin" aria-hidden="true" />}
              Kirim penawaran (simulasi)
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
