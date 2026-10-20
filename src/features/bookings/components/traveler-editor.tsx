"use client"

import { useState } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, UserPen } from "lucide-react"
import type { Traveler } from "@/domain/entities"
import { missingTravelerFields } from "@/domain/rules/travelers"
import { formatPhone } from "@/lib/format"
import { useCommand } from "@/hooks/use-command"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { Field } from "@/components/shared/field"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { optionalPhoneField } from "@/features/customers/schemas"
import { bookingCommands } from "@/services/booking-admin-service"

const schema = z.object({
  travelers: z.array(
    z
      .object({
        travelerId: z.string(),
        fullName: z.string().trim(),
        gender: z.enum(["", "L", "P"]),
        dateOfBirth: z.string(),
        phone: optionalPhoneField,
        emergencyName: z.string().trim(),
        emergencyPhone: optionalPhoneField,
        dietaryNotes: z.string().trim().max(200, "Maksimal 200 karakter."),
      })
      .superRefine((value, ctx) => {
        if (value.emergencyPhone && !value.emergencyName) ctx.addIssue({ code: "custom", path: ["emergencyName"], message: "Isi nama kontak darurat." })
        if (value.emergencyName && !value.emergencyPhone) ctx.addIssue({ code: "custom", path: ["emergencyPhone"], message: "Isi nomor kontak darurat." })
      }),
  ),
})

type Values = z.input<typeof schema>

function toValues(travelers: Traveler[]): Values {
  return {
    travelers: travelers.map((t) => ({
      travelerId: t.id,
      fullName: t.fullName ?? "",
      gender: t.gender ?? "",
      dateOfBirth: t.dateOfBirth ?? "",
      phone: t.phone ? formatPhone(t.phone) : "",
      emergencyName: t.emergencyContact?.name ?? "",
      emergencyPhone: t.emergencyContact?.phone ? formatPhone(t.emergencyContact.phone) : "",
      dietaryNotes: t.dietaryNotes ?? "",
    })),
  }
}

/** Sheet to complete traveler data for the manifest (Data peserta belum lengkap). */
export function TravelerEditor({ userId, bookingId, travelers, today, disabled }: { userId: string; bookingId: string; travelers: Traveler[]; today: string; disabled?: string | null }) {
  const [open, setOpen] = useState(false)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(travelers) })
  const { fields } = useFieldArray({ control: form.control, name: "travelers" })
  const save = useCommand(bookingCommands.updateTravelers, { success: "Data peserta disimpan", onSuccess: () => setOpen(false) })
  const errors = form.formState.errors.travelers

  const onSubmit = form.handleSubmit((values) => save.run(userId, bookingId, values.travelers))

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (value) form.reset(toValues(travelers))
        setOpen(value)
      }}
    >
      <PermissionButton permission="bookings.manage" disabledReason={disabled} variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <UserPen aria-hidden="true" /> Lengkapi data peserta
      </PermissionButton>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-xl">
        <SheetHeader className="border-b border-line px-5 py-4">
          <SheetTitle className="text-base font-semibold">Data peserta</SheetTitle>
          <SheetDescription>Lengkap = nama, jenis kelamin, tanggal lahir, dan kontak darurat terisi.</SheetDescription>
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
            {fields.map((field, index) => {
              const fieldErrors = errors?.[index]
              const original = travelers[index]
              const missing = original ? missingTravelerFields(original) : []
              return (
                <fieldset key={field.id} className="rounded-lg border border-line p-4">
                  <legend className="flex items-center gap-2 px-1 text-sm font-semibold">
                    Peserta {index + 1}
                    {missing.length === 0 ? <StatusBadge tone="success">Lengkap</StatusBadge> : <StatusBadge tone="warning">{missing.length} data kurang</StatusBadge>}
                  </legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nama lengkap" error={fieldErrors?.fullName?.message} className="sm:col-span-2">
                      {(c) => <Input {...c} {...form.register(`travelers.${index}.fullName`)} />}
                    </Field>
                    <Field label="Jenis kelamin">
                      {(c) => (
                        <Controller
                          control={form.control}
                          name={`travelers.${index}.gender`}
                          render={({ field: f }) => (
                            <Select value={f.value} onValueChange={f.onChange}>
                              <SelectTrigger id={c.id} className="w-full">
                                <SelectValue placeholder="Pilih" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="L">Laki-laki</SelectItem>
                                <SelectItem value="P">Perempuan</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      )}
                    </Field>
                    <Field label="Tanggal lahir" error={fieldErrors?.dateOfBirth?.message}>
                      {(c) => <Input {...c} type="date" max={today} {...form.register(`travelers.${index}.dateOfBirth`)} />}
                    </Field>
                    <Field label="Telepon" optional error={fieldErrors?.phone?.message}>
                      {(c) => <Input {...c} type="tel" {...form.register(`travelers.${index}.phone`)} />}
                    </Field>
                    <Field label="Catatan makanan" optional error={fieldErrors?.dietaryNotes?.message}>
                      {(c) => <Input {...c} {...form.register(`travelers.${index}.dietaryNotes`)} />}
                    </Field>
                    <Field label="Kontak darurat" error={fieldErrors?.emergencyName?.message}>
                      {(c) => <Input {...c} placeholder="Nama" {...form.register(`travelers.${index}.emergencyName`)} />}
                    </Field>
                    <Field label="Nomor kontak darurat" error={fieldErrors?.emergencyPhone?.message}>
                      {(c) => <Input {...c} type="tel" {...form.register(`travelers.${index}.emergencyPhone`)} />}
                    </Field>
                  </div>
                </fieldset>
              )
            })}
          </div>
          <SheetFooter className="flex-row justify-end gap-2 border-t border-line px-5 py-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={save.pending}>
              {save.pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Simpan data peserta
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
