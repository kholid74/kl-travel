"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Plus } from "lucide-react"
import type { DemoDatabase } from "@/domain/database"
import type { InquiryType } from "@/domain/entities"
import { INQUIRY_TYPE_LABEL, SOURCE_LABEL } from "@/domain/labels"
import type { Source } from "@/domain/types/common"
import { useCommand } from "@/hooks/use-command"
import { usePersona } from "@/hooks/use-persona"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { ChipToggle, QuantityStepper } from "@/components/shared/choice"
import { Field, FieldGroup } from "@/components/shared/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { ContactFields } from "@/features/customers/components/contact-fields"
import { contactSchema, EMPTY_CONTACT } from "@/features/customers/schemas"
import { inquiryCommands } from "@/services/inquiry-admin-service"

const SOURCES = (Object.keys(SOURCE_LABEL) as Source[]).filter((s): s is Exclude<Source, "website"> => s !== "website")
const TYPES = Object.keys(INQUIRY_TYPE_LABEL) as InquiryType[]

const schema = z
  .object({
    type: z.enum(["private", "custom", "general"]),
    source: z.enum(SOURCES as [Exclude<Source, "website">, ...Exclude<Source, "website">[]]),
    contact: contactSchema,
    packageId: z.string(),
    destinationIds: z.array(z.string()),
    startDate: z.string(),
    groupSize: z.number().int().min(1),
    message: z.string().trim().max(1000),
  })
  .superRefine((v, ctx) => {
    if (v.type === "private" && !v.packageId) ctx.addIssue({ code: "custom", path: ["packageId"], message: "Pilih paket private trip." })
    if (v.type === "custom" && v.destinationIds.length === 0) ctx.addIssue({ code: "custom", path: ["destinationIds"], message: "Pilih minimal satu destinasi." })
    if (v.type === "general" && !v.message) ctx.addIssue({ code: "custom", path: ["message"], message: "Tuliskan pertanyaannya." })
  })

type Values = z.input<typeof schema>

/** Lead received over WhatsApp, Instagram, referral, or at the office. */
export function ManualInquirySheet({ db, today }: { db: DemoDatabase; today: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { user } = usePersona()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { type: "private", source: "whatsapp", contact: EMPTY_CONTACT, packageId: "", destinationIds: [], startDate: "", groupSize: 2, message: "" },
  })
  const { control, register, setValue, getValues, formState } = form
  const errors = formState.errors
  const [type, groupSize, destinationIds] = useWatch({ control, name: ["type", "groupSize", "destinationIds"] })
  const create = useCommand(inquiryCommands.createManual, {
    success: (r) => `Inquiry ${r.code} dicatat`,
    onSuccess: (r) => {
      setOpen(false)
      router.push(`/dashboard/inquiries/${r.inquiryId}`)
    },
  })

  const packages = Object.values(db.packages).filter((p) => p.status === "published" && (type === "private" ? p.tripType === "private" : p.tripType !== "custom"))
  const destinations = Object.values(db.destinations).filter((d) => d.status === "published")

  const onSubmit = form.handleSubmit((v) => {
    if (!user) return
    void create.run(user.id, {
      type: v.type,
      source: v.source,
      contact: v.contact,
      packageId: v.type === "custom" ? undefined : v.packageId || undefined,
      destinationIds: v.type === "custom" ? v.destinationIds : undefined,
      travelDates: v.startDate ? { kind: "exact", startDate: v.startDate } : { kind: "flexible" },
      groupSize: v.groupSize,
      message: v.message,
    })
  })

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <PermissionButton permission="inquiries.manage" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" /> Inquiry manual
      </PermissionButton>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b border-line px-5 py-4">
          <SheetTitle className="text-base font-semibold">Catat inquiry</SheetTitle>
          <SheetDescription>Pelanggan lama dikenali dari nomor telepon atau email.</SheetDescription>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Jenis">
                {(c) => (
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value)
                          setValue("packageId", "")
                        }}
                      >
                        <SelectTrigger id={c.id} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {INQUIRY_TYPE_LABEL[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Field>
              <Field label="Sumber">
                {(c) => (
                  <Controller
                    control={control}
                    name="source"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id={c.id} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SOURCES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {SOURCE_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Field>
            </div>
            <ContactFields register={(field) => register(`contact.${field}`)} errors={errors.contact} />
            {type === "custom" ? (
              <FieldGroup legend="Destinasi" error={errors.destinationIds?.message}>
                <div className="flex flex-wrap gap-2">
                  {destinations.map((d) => (
                    <ChipToggle
                      key={d.id}
                      pressed={destinationIds.includes(d.id)}
                      onPressedChange={(on) =>
                        setValue("destinationIds", on ? [...getValues("destinationIds"), d.id] : getValues("destinationIds").filter((id) => id !== d.id), { shouldValidate: true })
                      }
                    >
                      {d.name}
                    </ChipToggle>
                  ))}
                </div>
              </FieldGroup>
            ) : (
              <Field label="Paket" optional={type === "general"} error={errors.packageId?.message}>
                {(c) => (
                  <Controller
                    control={control}
                    name="packageId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
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
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tanggal berangkat" optional description="Kosongkan bila masih fleksibel.">
                {(c) => <Input {...c} type="date" min={today} {...register("startDate")} />}
              </Field>
              <div className="grid content-start gap-1.5">
                <span className="text-sm font-medium">Jumlah peserta</span>
                <QuantityStepper value={groupSize} min={1} max={40} onChange={(n) => setValue("groupSize", n)} label="Jumlah peserta" />
              </div>
            </div>
            <Field label="Catatan / pertanyaan" optional={type !== "general"} error={errors.message?.message}>
              {(c) => <Textarea {...c} rows={3} {...register("message")} />}
            </Field>
          </div>
          <SheetFooter className="flex-row justify-end gap-2 border-t border-line px-5 py-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={create.pending}>
              {create.pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Simpan inquiry
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
