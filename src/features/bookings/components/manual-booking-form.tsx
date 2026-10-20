"use client"

import { useRouter } from "next/navigation"
import { useMemo } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, UserCheck } from "lucide-react"
import { formatDateRange, formatIDR } from "@/lib/format"
import { normalizeEmail, normalizePhone } from "@/lib/phone"
import { SOURCE_LABEL } from "@/domain/labels"
import { findCustomerMatch } from "@/domain/rules/customer-identity"
import type { Source } from "@/domain/types/common"
import { useCommand } from "@/hooks/use-command"
import { useLive } from "@/hooks/use-live"
import { usePersona } from "@/hooks/use-persona"
import { PageHeader } from "@/components/dashboard/page-header"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { SectionCard } from "@/components/dashboard/section-card"
import { QuantityStepper } from "@/components/shared/choice"
import { Field } from "@/components/shared/field"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ContactFields } from "@/features/customers/components/contact-fields"
import { contactSchema, EMPTY_CONTACT } from "@/features/customers/schemas"
import { bookingCommands } from "@/services/booking-admin-service"
import { packageAvailability } from "@/services/queries/catalog"

const SOURCES = (Object.keys(SOURCE_LABEL) as Source[]).filter((s): s is Exclude<Source, "website"> => s !== "website")

const schema = z.object({
  source: z.enum(SOURCES as [Exclude<Source, "website">, ...Exclude<Source, "website">[]]),
  packageId: z.string().min(1, "Pilih paket."),
  departureId: z.string().min(1, "Pilih keberangkatan."),
  pax: z.number().int().min(1),
  contact: contactSchema,
  contactTravels: z.boolean(),
  travelerNames: z.array(z.string()),
  specialRequests: z.string().trim().max(500, "Maksimal 500 karakter."),
  approveNow: z.boolean(),
})

type Values = z.input<typeof schema>

export function ManualBookingForm() {
  const live = useLive()
  const router = useRouter()
  const { user, denial } = usePersona()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      source: "whatsapp",
      packageId: "",
      departureId: "",
      pax: 1,
      contact: EMPTY_CONTACT,
      contactTravels: true,
      travelerNames: [""],
      specialRequests: "",
      approveNow: false,
    },
  })
  const { control, register, setValue, getValues, formState } = form
  const errors = formState.errors
  const [packageId, departureId, pax, phone, email, contactTravels, travelerNames] = useWatch({
    control,
    name: ["packageId", "departureId", "pax", "contact.phone", "contact.email", "contactTravels", "travelerNames"],
  })

  const create = useCommand(bookingCommands.createManual, {
    success: (r) => `Booking ${r.code} dicatat`,
    onSuccess: (r) => router.push(`/dashboard/bookings/${r.bookingId}`),
  })

  const packages = useMemo(
    () => (live ? Object.values(live.db.packages).filter((p) => p.tripType === "open" && p.status !== "archived").sort((a, b) => a.title.localeCompare(b.title)) : []),
    [live],
  )
  const options = useMemo(() => (live && packageId ? packageAvailability(live.db, packageId, live.now).options.filter((o) => o.bookable) : []), [live, packageId])
  const match = useMemo(() => {
    if (!live) return undefined
    const normalized = normalizePhone(phone ?? "")
    const mail = email ? normalizeEmail(email) : null
    if (!normalized && !mail) return undefined
    return findCustomerMatch(Object.values(live.db.customers), { phone: normalized ?? undefined, email: mail ?? undefined })
  }, [live, phone, email])

  if (!live) return <PageSkeleton variant="detail" />
  const option = options.find((o) => o.departure.id === departureId)
  const maxPax = Math.max(1, Math.min(option?.seats.available ?? 1, live.db.settings.booking.maxPaxPerBooking))
  const matched = match ? live.db.customers[match.id] : undefined

  const setPax = (next: number) => {
    setValue("pax", next)
    const names = getValues("travelerNames")
    setValue("travelerNames", Array.from({ length: next }, (_, i) => names[i] ?? ""))
  }

  const onSubmit = form.handleSubmit((values) => {
    if (!user) return
    if (values.pax > maxPax) {
      form.setError("pax", { message: `Sisa kursi tinggal ${maxPax}.` })
      return
    }
    void create.run(user.id, {
      source: values.source,
      approveNow: values.approveNow,
      packageId: values.packageId,
      departureId: values.departureId,
      contact: values.contact,
      contactTravels: values.contactTravels,
      travelers: values.travelerNames.map((name, i) => ({ fullName: i === 0 && values.contactTravels ? values.contact.fullName : name })),
      specialRequests: values.specialRequests,
    })
  })

  const blocked = denial("bookings.manage")

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader
        back={{ href: "/dashboard/bookings", label: "Booking" }}
        title="Booking manual"
        description="Untuk pesanan yang masuk lewat WhatsApp, Instagram, atau datang langsung. Aturan kursi sama dengan booking dari website."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <SectionCard title="Paket & jadwal">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Sumber booking">
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
              <Field label="Paket open trip" error={errors.packageId?.message}>
                {(c) => (
                  <Controller
                    control={control}
                    name="packageId"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value)
                          setValue("departureId", "")
                        }}
                      >
                        <SelectTrigger id={c.id} aria-invalid={c["aria-invalid"]} className="w-full">
                          <SelectValue placeholder="Pilih paket" />
                        </SelectTrigger>
                        <SelectContent>
                          {packages.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.title}
                              {p.status === "draft" && " (draf)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Field>
              <Field
                label="Keberangkatan"
                error={errors.departureId?.message}
                description={packageId && options.length === 0 ? "Tidak ada jadwal yang bisa dipesan untuk paket ini." : undefined}
                className="sm:col-span-2"
              >
                {(c) => (
                  <Controller
                    control={control}
                    name="departureId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange} disabled={!packageId || options.length === 0}>
                        <SelectTrigger id={c.id} aria-invalid={c["aria-invalid"]} aria-describedby={c["aria-describedby"]} className="w-full">
                          <SelectValue placeholder="Pilih tanggal" />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((o) => (
                            <SelectItem key={o.departure.id} value={o.departure.id}>
                              {formatDateRange(o.departure.startDate, o.departure.endDate)} · sisa {o.seats.available} kursi · {formatIDR(o.pricePerPax)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Field>
              <div className="flex items-center justify-between gap-4 sm:col-span-2">
                <div>
                  <p className="text-sm font-medium">Jumlah peserta</p>
                  <p className="text-xs text-muted-foreground">{option ? `Maksimal ${maxPax} untuk jadwal ini.` : "Pilih jadwal dulu."}</p>
                  {errors.pax && <p className="text-xs font-medium text-destructive">{errors.pax.message}</p>}
                </div>
                <QuantityStepper value={pax} min={1} max={maxPax} onChange={setPax} label="Jumlah peserta" />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Pemesan" description="Pelanggan lama dikenali dari nomor telepon atau email, sehingga tidak tercatat dua kali.">
            <ContactFields register={(field) => register(`contact.${field}`)} errors={errors.contact} />
            {matched && (
              <p className="mt-4 flex items-start gap-2 rounded-md bg-tone-info-bg px-3 py-2.5 text-sm text-tone-info">
                <UserCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  Pelanggan terdaftar: <strong>{matched.fullName}</strong> ({matched.code}). Booking akan ditautkan ke data ini; nama yang tersimpan tidak diubah.
                </span>
              </p>
            )}
            <label className="mt-5 flex items-center gap-3 text-sm">
              <Controller control={control} name="contactTravels" render={({ field }) => <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />} />
              Pemesan ikut sebagai peserta
            </label>
          </SectionCard>

          <SectionCard title="Nama peserta" description="Boleh dikosongkan dulu; detail lengkap bisa diisi dari halaman booking.">
            <ol className="grid gap-3 sm:grid-cols-2">
              {travelerNames.map((_, index) =>
                index === 0 && contactTravels ? (
                  <li key={index} className="grid gap-1.5">
                    <span className="text-sm font-medium">Peserta 1</span>
                    <p className="flex h-10 items-center rounded-md bg-muted px-3 text-sm text-muted-foreground">Sesuai nama pemesan</p>
                  </li>
                ) : (
                  <li key={index}>
                    <Field label={`Peserta ${index + 1}`} optional>
                      {(c) => <Input {...c} {...register(`travelerNames.${index}`)} />}
                    </Field>
                  </li>
                ),
              )}
            </ol>
            <Field label="Permintaan khusus" optional error={errors.specialRequests?.message} className="mt-5">
              {(c) => <Textarea {...c} rows={2} {...register("specialRequests")} />}
            </Field>
          </SectionCard>
        </div>

        <aside className="min-w-0">
          <div className="space-y-4 lg:sticky lg:top-20">
            <SectionCard title="Ringkasan">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Harga per orang</dt>
                  <dd className="tabular-nums">{option ? formatIDR(option.pricePerPax) : "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Peserta</dt>
                  <dd className="tabular-nums">{pax}</dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-line pt-2 font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{option ? formatIDR(option.pricePerPax * pax) : "—"}</dd>
                </div>
              </dl>
              <label className="mt-5 flex items-start gap-3 text-sm">
                <Controller control={control} name="approveNow" render={({ field }) => <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5" />} />
                <span>
                  Langsung verifikasi dan terbitkan invoice
                  <span className="block text-xs text-muted-foreground">Bila tidak dicentang, booking masuk sebagai Menunggu Verifikasi dan kursi ditahan 24 jam.</span>
                </span>
              </label>
              <Button type="submit" className="mt-5 w-full" disabled={create.pending || !!blocked}>
                {create.pending && <Loader2 className="animate-spin" aria-hidden="true" />}
                Simpan booking
              </Button>
              {blocked && <p className="mt-2 text-xs text-tone-danger">{blocked}</p>}
            </SectionCard>
          </div>
        </aside>
      </div>
    </form>
  )
}
