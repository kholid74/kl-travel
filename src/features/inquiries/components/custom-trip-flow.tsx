"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { AlertTriangle, Check, Pencil, Sparkles } from "lucide-react"
import type { TourPackage } from "@/domain/entities"
import { BUDGET_LABEL, INTEREST_LABEL, REGION_LABEL } from "@/domain/labels"
import type { BudgetRange, Interest } from "@/domain/types/common"
import { diffDays } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { useToday } from "@/hooks/use-now"
import { FlowShell, StepActions, StepHeading, SummaryCard } from "@/components/public/flow-shell"
import { ChipToggle, ChoiceCard, QuantityStepper } from "@/components/shared/choice"
import { DemoNotice } from "@/components/shared/demo-notice"
import { Field } from "@/components/shared/field"
import { SmartImage } from "@/components/shared/smart-image"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { ContactFields } from "@/features/customers/components/contact-fields"
import { sampleContact } from "@/features/customers/schemas"
import { usePublicCatalog } from "@/features/packages/hooks/use-public-catalog"
import { submitWebsiteInquiry } from "@/services/inquiry-service"
import type { PublicCatalog } from "@/services/queries/catalog"
import { formatTravelDates } from "../format"
import { BUDGETS, CUSTOM_STEP_FIELDS, customTripSchema, EMPTY_CONTACT, EMPTY_DATES, INTERESTS, toTravelDates, type CustomTripValues } from "../schemas"
import { DatePreferenceField } from "./date-preference-field"

const STEPS = ["Destinasi", "Tanggal", "Peserta", "Budget", "Minat", "Ringkasan"]

/**
 * Reads ?dari=<package slug> (inspiration package) or ?destinasi=<slug> to prefill the
 * form; must sit inside <Suspense>.
 */
export function CustomTripRoute({ initialCatalog }: { initialCatalog: PublicCatalog }) {
  const params = useSearchParams()
  const { packages, destinations } = usePublicCatalog(initialCatalog)
  const fromSlug = params.get("dari")
  const destinationSlug = params.get("destinasi")
  const inspiration = fromSlug ? packages.find((p) => p.slug === fromSlug) : undefined
  const destinationId = destinationSlug ? destinations.find((d) => d.slug === destinationSlug)?.id : undefined
  // Remount when the prefill resolves so the form starts from it.
  return (
    <CustomTripFlow
      key={`${inspiration?.id ?? ""}-${destinationId ?? ""}`}
      initialCatalog={initialCatalog}
      inspiration={inspiration}
      destinationId={destinationId}
    />
  )
}

export function CustomTripFallback({ initialCatalog }: { initialCatalog: PublicCatalog }) {
  return <CustomTripFlow initialCatalog={initialCatalog} />
}

function defaultsFrom(pkg: TourPackage | undefined, destinationId: string | undefined): CustomTripValues {
  return {
    destinationIds: pkg ? [pkg.destinationId] : destinationId ? [destinationId] : [],
    dates: { ...EMPTY_DATES, kind: "range" },
    durationDays: pkg?.durationDays ?? 4,
    groupSize: pkg ? Math.max(2, pkg.groupSize.min) : 2,
    budget: "",
    interests: pkg ? pkg.tags.filter((tag): tag is Interest => (INTERESTS as string[]).includes(tag)) : [],
    message: pkg ? `Terinspirasi dari paket ${pkg.title}. ` : "",
    contact: EMPTY_CONTACT,
    agree: false,
  }
}

function CustomTripFlow({
  initialCatalog,
  inspiration,
  destinationId,
}: {
  initialCatalog: PublicCatalog
  inspiration?: TourPackage
  destinationId?: string
}) {
  const router = useRouter()
  const today = useToday()
  const { destinations } = usePublicCatalog(initialCatalog)
  const [step, setStep] = useState(0)
  const [pending, setPending] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<CustomTripValues>({ resolver: zodResolver(customTripSchema), mode: "onTouched", defaultValues: defaultsFrom(inspiration, destinationId) })
  const { control, register, formState, setValue, getValues } = form
  const errors = formState.errors
  const values = useWatch({ control }) as CustomTripValues

  const rangeDays = values.dates.kind === "range" && values.dates.startDate && values.dates.endDate ? diffDays(values.dates.endDate, values.dates.startDate) + 1 : null
  const duration = rangeDays ?? values.durationDays
  const chosen = destinations.filter((d) => values.destinationIds.includes(d.id))

  const toggle = (key: "destinationIds" | "interests", item: string, on: boolean) => {
    const current = getValues(key)
    setValue(key, on ? [...current, item] : current.filter((value) => value !== item), { shouldValidate: formState.isSubmitted || !!errors[key] })
  }

  const goNext = async () => {
    setSubmitError(null)
    if (step === 1 && rangeDays) setValue("durationDays", Math.min(21, rangeDays))
    if (await form.trigger([...CUSTOM_STEP_FIELDS[step]])) setStep((s) => s + 1)
  }

  const onSubmit = form.handleSubmit(async (data) => {
    setPending(true)
    setSubmitError(null)
    const result = await submitWebsiteInquiry({
      type: "custom",
      contact: data.contact,
      packageId: inspiration?.id,
      destinationIds: data.destinationIds,
      travelDates: toTravelDates(data.dates),
      durationDays: rangeDays ?? data.durationDays,
      groupSize: data.groupSize,
      budgetPerPax: data.budget as BudgetRange,
      interests: data.interests as Interest[],
      message: data.message,
    })
    if (result.ok) {
      toast.success("Permintaan terkirim", { description: `Kode permintaan ${result.data.code}` })
      router.push(`/konfirmasi/permintaan/${result.data.code}`)
      return
    }
    setPending(false)
    setSubmitError(result.error.message)
  })

  const datesText =
    values.dates.kind === "flexible"
      ? values.dates.month
        ? formatTravelDates(toTravelDates(values.dates))
        : "Fleksibel"
      : values.dates.startDate && values.dates.endDate
        ? formatTravelDates(toTravelDates(values.dates))
        : "Belum dipilih"

  const summaryRows: { label: string; value: string; step: number }[] = [
    { label: "Destinasi", value: chosen.map((d) => d.name).join(", ") || "Belum dipilih", step: 0 },
    { label: "Tanggal", value: `${datesText} · ${duration} hari`, step: 1 },
    { label: "Peserta", value: `${values.groupSize} orang`, step: 2 },
    { label: "Budget", value: values.budget ? BUDGET_LABEL[values.budget as BudgetRange] : "Belum dipilih", step: 3 },
    { label: "Minat", value: values.interests.map((i) => INTEREST_LABEL[i as Interest]).join(", ") || "Belum dipilih", step: 4 },
  ]

  return (
    <FlowShell
      backHref={inspiration ? `/paket/${inspiration.slug}` : "/paket?jenis=custom"}
      backLabel={inspiration ? "Kembali ke paket" : "Lihat paket inspirasi"}
      eyebrow="Custom trip"
      title="Rancang perjalanan Anda"
      steps={STEPS}
      current={step}
      summary={
        <SummaryCard>
          {inspiration && (
            <p className="mb-4 flex items-center gap-2 rounded-md bg-sand-100 px-3 py-2 text-xs text-sand-800">
              <Sparkles className="size-3.5 shrink-0" aria-hidden="true" /> Dimulai dari paket {inspiration.title}
            </p>
          )}
          <p className="text-sm font-semibold text-ocean-900">Rencana Anda</p>
          <dl className="mt-3 space-y-2.5 text-sm">
            {summaryRows.map((row) => (
              <div key={row.label} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="text-right font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 rounded-md bg-muted px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            Tim kami menyusun itinerary per hari dan rincian harga, lalu mengirimkannya sebagai penawaran yang bisa direvisi.
          </p>
        </SummaryCard>
      }
    >
      <form
        noValidate
        onSubmit={(event) => {
          if (step < STEPS.length - 1) {
            event.preventDefault()
            void goNext()
            return
          }
          void onSubmit(event)
        }}
      >
        {submitError && (
          <p role="alert" className="mb-6 flex gap-2.5 rounded-md bg-tone-danger-bg px-4 py-3 text-sm text-tone-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {submitError}
          </p>
        )}

        {step === 0 && (
          <section>
            <StepHeading title="Ke mana Anda ingin pergi?" description="Pilih satu atau beberapa destinasi. Kami bisa menggabungkannya dalam satu perjalanan." />
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {destinations.map((destination) => {
                const checked = values.destinationIds.includes(destination.id)
                return (
                  <li key={destination.id}>
                    <label
                      className={cn(
                        "group relative block cursor-pointer overflow-hidden rounded-[4px] border bg-card has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2",
                        checked ? "border-primary shadow-[inset_0_0_0_1px_var(--primary)]" : "border-border",
                      )}
                    >
                      <input type="checkbox" className="sr-only" checked={checked} onChange={(event) => toggle("destinationIds", destination.id, event.target.checked)} />
                      <span className="relative block aspect-[4/3] bg-muted">
                        <SmartImage mediaId={destination.coverMediaId} fill sizes="(min-width: 640px) 220px, 45vw" alt="" />
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute top-2 right-2 flex size-6 items-center justify-center rounded-full border-2 transition-colors",
                            checked ? "border-primary bg-primary text-primary-foreground" : "border-ivory-50 bg-ocean-950/30",
                          )}
                        >
                          {checked && <Check className="size-3.5" />}
                        </span>
                      </span>
                      <span className="block px-3 py-2.5">
                        <span className="block text-sm font-semibold">{destination.name}</span>
                        <span className="block text-xs text-muted-foreground">{REGION_LABEL[destination.region]}</span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
            {errors.destinationIds && (
              <p role="alert" className="mt-3 text-sm font-medium text-destructive">
                {errors.destinationIds.message}
              </p>
            )}
          </section>
        )}

        {step === 1 && (
          <section className="space-y-8">
            <StepHeading title="Kapan dan berapa lama?" />
            <Controller
              control={control}
              name="dates"
              render={({ field }) => <DatePreferenceField value={field.value} onChange={field.onChange} mode="range" today={today} errors={errors.dates} />}
            />
            {values.dates.kind === "flexible" && (
              <div className="flex flex-col gap-4 rounded-[4px] border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Lama perjalanan</p>
                  <p className="text-sm text-muted-foreground">Perkiraan saja, bisa diubah saat penawaran.</p>
                </div>
                <QuantityStepper value={values.durationDays} min={1} max={21} unit="hari" onChange={(n) => setValue("durationDays", n)} label="Lama perjalanan" />
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <section>
            <StepHeading title="Berapa orang yang ikut?" description="Termasuk anak-anak. Detail usia bisa ditulis di catatan pada langkah terakhir." />
            <div className="flex flex-col gap-6 rounded-[4px] border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-semibold">Jumlah peserta</p>
              <QuantityStepper value={values.groupSize} min={1} max={40} onChange={(n) => setValue("groupSize", n)} label="Jumlah peserta" />
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <StepHeading title="Kisaran budget per orang" description="Di luar tiket pesawat menuju destinasi. Kami menyesuaikan akomodasi dan aktivitas dengan kisaran ini." />
            <div role="radiogroup" aria-label="Kisaran budget per orang" className="grid gap-3 sm:grid-cols-2">
              {BUDGETS.map((budget) => (
                <ChoiceCard
                  key={budget}
                  type="radio"
                  name="budget"
                  value={budget}
                  checked={values.budget === budget}
                  onChange={() => setValue("budget", budget, { shouldValidate: true })}
                  title={BUDGET_LABEL[budget]}
                />
              ))}
            </div>
            {errors.budget && (
              <p role="alert" className="mt-3 text-sm font-medium text-destructive">
                {errors.budget.message}
              </p>
            )}
          </section>
        )}

        {step === 4 && (
          <section>
            <StepHeading title="Apa yang paling ingin Anda alami?" description="Pilih sebanyak yang Anda suka." />
            <div className="flex flex-wrap gap-2" role="group" aria-label="Minat">
              {INTERESTS.map((interest) => (
                <ChipToggle key={interest} pressed={values.interests.includes(interest)} onPressedChange={(on) => toggle("interests", interest, on)}>
                  {INTEREST_LABEL[interest]}
                </ChipToggle>
              ))}
            </div>
            {errors.interests && (
              <p role="alert" className="mt-3 text-sm font-medium text-destructive">
                {errors.interests.message}
              </p>
            )}
          </section>
        )}

        {step === 5 && (
          <section className="space-y-8">
            <StepHeading title="Periksa rencana Anda" description="Lengkapi data kontak agar tim kami bisa mengirim penawaran." />
            <ul className="divide-y divide-border rounded-[4px] border border-border bg-card">
              {summaryRows.map((row) => (
                <li key={row.label} className="flex items-start justify-between gap-4 px-5 py-3.5 text-sm">
                  <span>
                    <span className="block font-semibold">{row.label}</span>
                    <span className="text-muted-foreground">{row.value}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(row.step)}
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-lagoon-700 underline-offset-4 hover:underline"
                    aria-label={`Ubah ${row.label.toLowerCase()}`}
                  >
                    <Pencil className="size-3" aria-hidden="true" /> Ubah
                  </button>
                </li>
              ))}
            </ul>
            <Field label="Ceritakan lebih banyak" optional error={errors.message?.message} description="Gaya perjalanan, rute impian, kebutuhan khusus, atau momen yang ingin dirayakan.">
              {(c) => <Textarea {...c} {...register("message")} rows={4} />}
            </Field>
            <div>
              <h3 className="mb-4 text-base font-semibold text-ocean-900">Data kontak</h3>
              <DemoNotice className="mb-6">
                Situs demo: gunakan data fiktif.{" "}
                <button type="button" onClick={() => setValue("contact", sampleContact(), { shouldValidate: true })} className="font-semibold underline underline-offset-2">
                  Isi data contoh
                </button>
              </DemoNotice>
              <ContactFields register={(field) => register(`contact.${field}`)} errors={errors.contact} />
            </div>
            <div>
              <label className="flex items-start gap-3 text-sm leading-relaxed">
                <Controller
                  control={control}
                  name="agree"
                  render={({ field }) => (
                    <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} aria-invalid={errors.agree ? true : undefined} className="mt-0.5" />
                  )}
                />
                <span>Saya bersedia dihubungi untuk penawaran ini dan memahami bahwa ini permintaan simulasi di situs demo.</span>
              </label>
              {errors.agree && <p className="mt-2 text-xs font-medium text-destructive">{errors.agree.message}</p>}
            </div>
          </section>
        )}

        <StepActions
          onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}
          nextLabel={step === STEPS.length - 1 ? "Kirim permintaan" : "Lanjut"}
          nextType={step === STEPS.length - 1 ? "submit" : "button"}
          onNext={step === STEPS.length - 1 ? undefined : goNext}
          pending={pending}
        />
      </form>
    </FlowShell>
  )
}
