"use client"

import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { AlertTriangle, Pencil } from "lucide-react"
import type { Settings } from "@/domain/entities"
import { formatDateRange, formatIDR } from "@/lib/format"
import { useToday } from "@/hooks/use-now"
import { FlowShell, FlowSkeleton, StepActions, StepHeading } from "@/components/public/flow-shell"
import { NotFoundState } from "@/components/public/not-found-state"
import { QuantityStepper } from "@/components/shared/choice"
import { DemoNotice } from "@/components/shared/demo-notice"
import { Field } from "@/components/shared/field"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ContactFields } from "@/features/customers/components/contact-fields"
import { EMPTY_CONTACT, SAMPLE_COMPANIONS, sampleContact } from "@/features/customers/schemas"
import { DepartureList } from "@/features/packages/components/departure-list"
import { useBookingSettings, usePackageAvailability, usePublicCatalog } from "@/features/packages/hooks/use-public-catalog"
import { submitWebsiteBooking } from "@/services/booking-service"
import type { PublicCatalog } from "@/services/queries/catalog"
import { BOOKING_STEP_FIELDS, bookingFormSchema, type BookingFormValues } from "../schemas"
import { BookingSummary } from "./booking-summary"

const STEPS = ["Keberangkatan", "Jumlah peserta", "Data peserta", "Ringkasan"]
const EMPTY_TRAVELER = { fullName: "", gender: "" as const, dateOfBirth: "" }

interface FlowProps {
  initialCatalog: PublicCatalog
  initialSettings: Settings["booking"]
}

/** Reads the slug, ?keberangkatan= and ?peserta=; must sit inside <Suspense>. */
export function BookingFlowRoute(props: FlowProps) {
  const { slug } = useParams<{ slug: string }>()
  const params = useSearchParams()
  const pax = Number(params.get("peserta"))
  return (
    <BookingFlow
      {...props}
      slug={slug}
      preselectCode={params.get("keberangkatan")}
      initialPax={Number.isInteger(pax) && pax > 0 ? pax : 1}
    />
  )
}

function BookingFlow({ slug, preselectCode, initialPax, initialCatalog, initialSettings }: FlowProps & { slug: string; preselectCode: string | null; initialPax: number }) {
  const router = useRouter()
  const today = useToday()
  const { packages, destinations, live } = usePublicCatalog(initialCatalog)
  const settings = useBookingSettings(initialSettings)
  const pkg = packages.find((p) => p.slug === slug)
  const availability = usePackageAvailability(pkg?.id)
  const [step, setStep] = useState(0)
  const [pending, setPending] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    mode: "onTouched",
    defaultValues: {
      departureId: "",
      pax: Math.min(initialPax, initialSettings.maxPaxPerBooking),
      contact: EMPTY_CONTACT,
      contactTravels: true,
      travelers: Array.from({ length: Math.min(initialPax, initialSettings.maxPaxPerBooking) }, () => EMPTY_TRAVELER),
      emergency: { name: "", phone: "" },
      specialRequests: "",
      agree: false,
    },
  })
  const { register, control, formState, getValues, setValue } = form
  const errors = formState.errors

  // Private trips are requested, not booked.
  useEffect(() => {
    if (pkg && pkg.tripType !== "open") router.replace(`/paket/${pkg.slug}/ajukan`)
  }, [pkg, router])

  // Preselect the departure chosen on the package page once seats are known.
  useEffect(() => {
    if (!availability || getValues("departureId")) return
    const preselected = availability.options.find((o) => o.bookable && o.departure.code === preselectCode) ?? availability.next
    if (preselected) setValue("departureId", preselected.departure.id)
  }, [availability, preselectCode, getValues, setValue])

  const departureId = useWatch({ control, name: "departureId" })
  const pax = useWatch({ control, name: "pax" })
  const contactTravels = useWatch({ control, name: "contactTravels" })
  const contactName = useWatch({ control, name: "contact.fullName" })
  const travelers = useWatch({ control, name: "travelers" })

  if (!pkg) {
    if (!live) return <FlowSkeleton />
    return <NotFoundState title="Paket tidak ditemukan" description="Paket ini tidak lagi tersedia untuk dipesan." backHref="/paket" backLabel="Lihat semua paket" />
  }
  if (pkg.tripType !== "open") return <FlowSkeleton />

  const destination = destinations.find((d) => d.id === pkg.destinationId)
  const option = availability?.options.find((o) => o.departure.id === departureId) ?? null
  const maxPax = Math.max(1, Math.min(option?.seats.available ?? 1, settings.maxPaxPerBooking))

  const setPax = (next: number) => {
    const current = getValues("travelers")
    setValue("pax", next)
    setValue(
      "travelers",
      Array.from({ length: next }, (_, i) => current[i] ?? EMPTY_TRAVELER),
    )
  }

  const goNext = async () => {
    setSubmitError(null)
    const valid = await form.trigger([...BOOKING_STEP_FIELDS[step]])
    if (!valid) return
    if (step === 0 && !option?.bookable) {
      form.setError("departureId", { message: "Keberangkatan ini sudah tidak bisa dipesan. Pilih jadwal lain." })
      return
    }
    if (step === 1 && pax > maxPax) {
      setPax(maxPax)
      form.setError("pax", { message: `Sisa kursi tinggal ${maxPax}. Jumlah peserta disesuaikan.` })
      return
    }
    setStep((s) => s + 1)
  }

  const fillSample = () => {
    const contact = sampleContact()
    setValue("contact", contact, { shouldValidate: true })
    setValue("contactTravels", true)
    setValue(
      "travelers",
      getValues("travelers").map((traveler, i) => ({
        fullName: i === 0 ? contact.fullName : SAMPLE_COMPANIONS[(i - 1) % SAMPLE_COMPANIONS.length],
        gender: i % 2 === 0 ? ("P" as const) : ("L" as const),
        dateOfBirth: `${1988 + i}-0${(i % 9) + 1}-1${i % 9}`,
      })),
      { shouldValidate: true },
    )
    setValue("emergency", { name: "Hendra Putra", phone: "0811-0000-7788" }, { shouldValidate: true })
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setPending(true)
    setSubmitError(null)
    const result = await submitWebsiteBooking({
      packageId: pkg.id,
      departureId: values.departureId,
      contact: values.contact,
      contactTravels: values.contactTravels,
      travelers: values.travelers.map((t, i) => ({
        fullName: i === 0 && values.contactTravels ? values.contact.fullName : t.fullName,
        gender: t.gender || undefined,
        dateOfBirth: t.dateOfBirth || undefined,
      })),
      emergencyContact: values.emergency.name ? values.emergency : undefined,
      specialRequests: values.specialRequests,
    })
    if (result.ok) {
      toast.success("Pemesanan terkirim", { description: `Kode booking ${result.data.code}` })
      router.push(`/konfirmasi/booking/${result.data.code}`)
      return
    }
    setPending(false)
    setSubmitError(result.error.message)
    if (result.error.code === "SEATS_UNAVAILABLE") setStep(result.error.field === "travelers" ? 1 : 0)
  })

  const errorBanner = submitError && (
    <p role="alert" className="mb-6 flex gap-2.5 rounded-md bg-tone-danger-bg px-4 py-3 text-sm text-tone-danger">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {submitError}
    </p>
  )

  return (
    <FlowShell
      backHref={`/paket/${pkg.slug}`}
      backLabel="Kembali ke paket"
      eyebrow="Pesan open trip"
      title={pkg.title}
      steps={STEPS}
      current={step}
      summary={<BookingSummary pkg={pkg} destination={destination} option={option} pax={pax} today={today} />}
    >
      <form
        noValidate
        onSubmit={(event) => {
          // Enter in a field moves to the next step instead of submitting early.
          if (step < STEPS.length - 1) {
            event.preventDefault()
            void goNext()
            return
          }
          void onSubmit(event)
        }}
      >
        {errorBanner}

        {step === 0 && (
          <section>
            <StepHeading title="Pilih tanggal keberangkatan" description="Sisa kursi diperbarui langsung, termasuk kursi yang sedang ditahan pemesanan lain." />
            <DepartureList
              options={availability?.options ?? null}
              selectedId={departureId || null}
              onSelect={(id) => setValue("departureId", id, { shouldValidate: true })}
              packageSlug={pkg.slug}
            />
            {errors.departureId && (
              <p role="alert" className="mt-3 text-sm font-medium text-destructive">
                {errors.departureId.message}
              </p>
            )}
          </section>
        )}

        {step === 1 && (
          <section>
            <StepHeading title="Berapa orang yang ikut?" description={`Maksimal ${settings.maxPaxPerBooking} orang per pemesanan, sesuai sisa kursi.`} />
            <div className="flex flex-col gap-6 rounded-[4px] border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Peserta</p>
                <p className="text-sm text-muted-foreground">
                  {option ? `${formatIDR(option.pricePerPax)} per orang · sisa ${option.seats.available} kursi` : "Pilih keberangkatan dulu"}
                </p>
              </div>
              <QuantityStepper value={pax} min={1} max={maxPax} onChange={setPax} label="Jumlah peserta" />
            </div>
            {errors.pax && (
              <p role="alert" className="mt-3 text-sm font-medium text-destructive">
                {errors.pax.message}
              </p>
            )}
            <p className="mt-4 text-sm text-muted-foreground">
              Rombongan lebih dari {settings.maxPaxPerBooking} orang?{" "}
              <Link href={`/paket/${pkg.slug}#jadwal`} className="font-semibold text-lagoon-700 underline underline-offset-4">
                Pertimbangkan private trip
              </Link>{" "}
              atau{" "}
              <Link href={`/kontak?paket=${pkg.slug}`} className="font-semibold text-lagoon-700 underline underline-offset-4">
                hubungi kami
              </Link>
              .
            </p>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-10">
            <div>
              <StepHeading title="Data pemesan" description="Kami menghubungi nomor ini untuk verifikasi dan pengiriman invoice." />
              <DemoNotice className="mb-6">
                Situs demo: gunakan data fiktif.{" "}
                <button type="button" onClick={fillSample} className="font-semibold underline underline-offset-2">
                  Isi data contoh
                </button>
              </DemoNotice>
              <ContactFields register={(field) => register(`contact.${field}`)} errors={errors.contact} />
              <label className="mt-5 flex items-center gap-3 text-sm">
                <Controller
                  control={control}
                  name="contactTravels"
                  render={({ field }) => <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />}
                />
                Saya juga ikut sebagai peserta
              </label>
            </div>

            <div>
              <h3 className="text-base font-semibold text-ocean-900">Data peserta</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Nama sesuai identitas. Jenis kelamin dan tanggal lahir boleh dilengkapi nanti, paling lambat sebelum manifest final.
              </p>
              <ol className="mt-5 space-y-4">
                {travelers.map((_, index) => {
                  const isContact = index === 0 && contactTravels
                  const travelerErrors = errors.travelers?.[index]
                  return (
                    <li key={index} className="rounded-[4px] border border-border bg-card p-5">
                      <p className="text-sm font-semibold">
                        Peserta {index + 1}
                        {isContact && <span className="font-normal text-muted-foreground"> · pemesan</span>}
                      </p>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        {isContact ? (
                          <div className="grid gap-1.5 sm:col-span-2">
                            <span className="text-sm font-medium">Nama lengkap</span>
                            <p className="flex h-10 items-center rounded-md bg-muted px-3 text-sm text-muted-foreground">{contactName || "Sesuai nama pemesan"}</p>
                          </div>
                        ) : (
                          <Field label="Nama lengkap" error={travelerErrors?.fullName?.message} className="sm:col-span-2">
                            {(c) => <Input {...c} {...register(`travelers.${index}.fullName`)} autoComplete="off" />}
                          </Field>
                        )}
                        <Field label="Jenis kelamin" optional>
                          {(c) => (
                            <Controller
                              control={control}
                              name={`travelers.${index}.gender`}
                              render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger id={c.id} aria-describedby={c["aria-describedby"]} className="w-full">
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
                        <Field label="Tanggal lahir" optional error={travelerErrors?.dateOfBirth?.message}>
                          {(c) => <Input {...c} {...register(`travelers.${index}.dateOfBirth`)} type="date" max={today ?? undefined} />}
                        </Field>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>

            <div>
              <h3 className="text-base font-semibold text-ocean-900">Kontak darurat</h3>
              <p className="mt-1 text-sm text-muted-foreground">Keluarga atau teman yang tidak ikut perjalanan. Boleh dilengkapi nanti.</p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field label="Nama" optional error={errors.emergency?.name?.message}>
                  {(c) => <Input {...c} {...register("emergency.name")} />}
                </Field>
                <Field label="Nomor telepon" optional error={errors.emergency?.phone?.message}>
                  {(c) => <Input {...c} {...register("emergency.phone")} type="tel" inputMode="tel" />}
                </Field>
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <StepHeading title="Periksa pemesanan Anda" description="Pastikan semua data sudah benar sebelum dikirim." />
            <div className="divide-y divide-border rounded-[4px] border border-border bg-card">
              <ReviewRow title="Keberangkatan" onEdit={() => setStep(0)}>
                {option ? formatDateRange(option.departure.startDate, option.departure.endDate) : "—"} · {pax} peserta
              </ReviewRow>
              <ReviewRow title="Pemesan" onEdit={() => setStep(2)}>
                {getValues("contact.fullName")} · {getValues("contact.phone")}
                {getValues("contact.email") && ` · ${getValues("contact.email")}`}
              </ReviewRow>
              <ReviewRow title="Peserta" onEdit={() => setStep(2)}>
                <ol className="list-decimal space-y-0.5 pl-5">
                  {travelers.map((t, i) => (
                    <li key={i}>{i === 0 && contactTravels ? contactName : t.fullName}</li>
                  ))}
                </ol>
              </ReviewRow>
            </div>

            <div className="mt-8 grid gap-6">
              <Field label="Permintaan khusus" optional error={errors.specialRequests?.message} description="Misalnya alergi makanan, kebutuhan kamar, atau perayaan khusus.">
                {(c) => <Textarea {...c} {...register("specialRequests")} rows={3} />}
              </Field>
              <div>
                <label className="flex items-start gap-3 text-sm leading-relaxed">
                  <Controller
                    control={control}
                    name="agree"
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        aria-invalid={errors.agree ? true : undefined}
                        className="mt-0.5"
                      />
                    )}
                  />
                  <span>
                    Saya sudah membaca{" "}
                    <Link href={`/paket/${pkg.slug}#info`} target="_blank" className="font-semibold text-lagoon-700 underline underline-offset-4">
                      syarat & kebijakan pembatalan
                    </Link>
                    , dan memahami bahwa ini pemesanan simulasi di situs demo.
                  </span>
                </label>
                {errors.agree && <p className="mt-2 text-xs font-medium text-destructive">{errors.agree.message}</p>}
              </div>
            </div>
          </section>
        )}

        <StepActions
          onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}
          nextLabel={step === STEPS.length - 1 ? "Kirim pemesanan" : "Lanjut"}
          nextType={step === STEPS.length - 1 ? "submit" : "button"}
          onNext={step === STEPS.length - 1 ? undefined : goNext}
          pending={pending}
          disabled={step === 0 && !availability}
        />
      </form>
    </FlowShell>
  )
}

function ReviewRow({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 p-5">
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-foreground">{title}</p>
        <div className="mt-1 text-muted-foreground">{children}</div>
      </div>
      <button type="button" onClick={onEdit} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-lagoon-700 underline-offset-4 hover:underline">
        <Pencil className="size-3" aria-hidden="true" /> Ubah
      </button>
    </div>
  )
}
