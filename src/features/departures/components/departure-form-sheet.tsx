"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CalendarPlus, Loader2 } from "lucide-react"
import { addDays, rangesOverlap } from "@/lib/dates"
import { formatDateRange, formatIDR, formatNumber } from "@/lib/format"
import type { DemoDatabase } from "@/domain/database"
import { useCommand } from "@/hooks/use-command"
import { usePersona } from "@/hooks/use-persona"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { Field } from "@/components/shared/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { departureCommands } from "@/services/departure-service"

const NONE = "__tanpa"

const schema = z
  .object({
    packageId: z.string().min(1, "Pilih paket."),
    startDate: z.string().min(1, "Pilih tanggal berangkat."),
    capacity: z.number({ error: "Isi kapasitas." }).int().min(1, "Minimal 1 kursi.").max(60),
    minParticipants: z.number({ error: "Isi peserta minimum." }).int().min(1),
    priceOverride: z.number().int().min(0),
    guideId: z.string(),
    notes: z.string().trim().max(300),
  })
  .superRefine((v, ctx) => {
    if (v.minParticipants > v.capacity) ctx.addIssue({ code: "custom", path: ["minParticipants"], message: "Tidak boleh melebihi kapasitas." })
  })

type Values = z.input<typeof schema>

/** Schedule an Open Trip departure (copies the package cost template and checklist). */
export function DepartureFormSheet({ db, today, packageId, label = "Jadwalkan keberangkatan" }: { db: DemoDatabase; today: string; packageId?: string; label?: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { user } = usePersona()
  const packages = Object.values(db.packages).filter((p) => p.tripType === "open" && p.status !== "archived")
  const initial = packageId ? db.packages[packageId] : undefined
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { packageId: packageId ?? "", startDate: "", capacity: initial?.groupSize.max ?? 12, minParticipants: Math.min(4, initial?.groupSize.max ?? 4), priceOverride: 0, guideId: NONE, notes: "" },
  })
  const errors = form.formState.errors
  const [selectedId, startDate, guideId] = useWatch({ control: form.control, name: ["packageId", "startDate", "guideId"] })
  const pkg = db.packages[selectedId]
  const endDate = pkg && startDate ? addDays(startDate, pkg.durationDays - 1) : null
  const guides = Object.values(db.guides).filter((g) => g.status === "active")
  const clash =
    guideId !== NONE && endDate
      ? Object.values(db.departures).find((d) => d.guideId === guideId && !d.cancelledAt && rangesOverlap(d.startDate, d.endDate, startDate, endDate))
      : undefined
  const create = useCommand(departureCommands.create, {
    success: (d) => `Keberangkatan ${d.code} dibuat`,
    onSuccess: (d) => {
      setOpen(false)
      router.push(`/dashboard/departures/${d.id}`)
    },
  })

  const onSubmit = form.handleSubmit((v) => {
    if (!user) return
    void create.run(user.id, {
      packageId: v.packageId,
      startDate: v.startDate,
      capacity: v.capacity,
      minParticipants: v.minParticipants,
      pricePerPaxOverride: v.priceOverride || undefined,
      guideId: v.guideId === NONE ? undefined : v.guideId,
      notes: v.notes,
    })
  })

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <PermissionButton
        permission="departures.manage"
        disabledReason={packageId && initial?.tripType !== "open" ? "Private trip dijadwalkan dari konversi inquiry." : null}
        onClick={() => setOpen(true)}
        variant={packageId ? "secondary" : "default"}
        size={packageId ? "sm" : "default"}
      >
        <CalendarPlus aria-hidden="true" /> {label}
      </PermissionButton>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-line px-5 py-4">
          <SheetTitle className="text-base font-semibold">Keberangkatan baru</SheetTitle>
          <SheetDescription>Template biaya paket dan checklist operasional disalin otomatis.</SheetDescription>
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
            <Field label="Paket open trip" error={errors.packageId?.message}>
              {(c) => (
                <Controller
                  control={form.control}
                  name="packageId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value)
                        const next = db.packages[value]
                        if (next) form.setValue("capacity", next.groupSize.max)
                      }}
                      disabled={!!packageId}
                    >
                      <SelectTrigger id={c.id} aria-invalid={c["aria-invalid"]} className="w-full">
                        <SelectValue placeholder="Pilih paket" />
                      </SelectTrigger>
                      <SelectContent>
                        {packages.map((p) => (
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
            <Field label="Tanggal berangkat" error={errors.startDate?.message} description={endDate ? `Pulang ${formatDateRange(startDate, endDate)}` : undefined}>
              {(c) => <Input {...c} type="date" min={addDays(today, 1)} {...form.register("startDate")} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kapasitas (kursi)" error={errors.capacity?.message}>
                {(c) => <Input {...c} type="number" min={1} {...form.register("capacity", { valueAsNumber: true })} />}
              </Field>
              <Field label="Peserta minimum" error={errors.minParticipants?.message} description="Syarat pasti berangkat.">
                {(c) => <Input {...c} type="number" min={1} {...form.register("minParticipants", { valueAsNumber: true })} />}
              </Field>
            </div>
            <Field label="Harga khusus per orang" optional description={pkg?.pricing.kind === "per_pax" ? `Kosongkan untuk harga paket ${formatIDR(pkg.pricing.pricePerPax)}.` : undefined}>
              {(c) => (
                <Controller
                  control={form.control}
                  name="priceOverride"
                  render={({ field }) => (
                    <Input
                      {...c}
                      inputMode="numeric"
                      value={field.value ? formatNumber(field.value) : ""}
                      onChange={(e) => field.onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
                      placeholder="Contoh: harga musim liburan"
                    />
                  )}
                />
              )}
            </Field>
            <Field label="Guide" optional description={clash ? undefined : "Guide yang sudah bertugas di tanggal yang sama akan ditolak."} error={clash ? `Bentrok dengan ${clash.code} (${formatDateRange(clash.startDate, clash.endDate)}).` : undefined}>
              {(c) => (
                <Controller
                  control={form.control}
                  name="guideId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id={c.id} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Belum ditentukan</SelectItem>
                        {guides.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                            {pkg && !g.destinationIds.includes(pkg.destinationId) && " (di luar wilayah)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </Field>
            <Field label="Catatan internal" optional>
              {(c) => <Textarea {...c} rows={2} {...form.register("notes")} />}
            </Field>
          </div>
          <SheetFooter className="flex-row justify-end gap-2 border-t border-line px-5 py-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={create.pending || !!clash}>
              {create.pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Buat keberangkatan
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
