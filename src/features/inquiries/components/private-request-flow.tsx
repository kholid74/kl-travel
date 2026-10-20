"use client"

import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { AlertTriangle } from "lucide-react"
import type { Settings } from "@/domain/entities"
import { INTEREST_LABEL } from "@/domain/labels"
import { tierFor } from "@/domain/rules/pricing"
import type { Interest } from "@/domain/types/common"
import { formatDuration, formatIDR } from "@/lib/format"
import { useToday } from "@/hooks/use-now"
import { FlowShell, FlowSkeleton, StepActions, StepHeading, SummaryCard } from "@/components/public/flow-shell"
import { NotFoundState } from "@/components/public/not-found-state"
import { ChipToggle, QuantityStepper } from "@/components/shared/choice"
import { DemoNotice } from "@/components/shared/demo-notice"
import { Field, FieldGroup } from "@/components/shared/field"
import { SmartImage } from "@/components/shared/smart-image"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { ContactFields } from "@/features/customers/components/contact-fields"
import { sampleContact } from "@/features/customers/schemas"
import { usePublicCatalog } from "@/features/packages/hooks/use-public-catalog"
import { submitWebsiteInquiry } from "@/services/inquiry-service"
import type { PublicCatalog } from "@/services/queries/catalog"
import { formatTravelDates } from "../format"
import { EMPTY_CONTACT, EMPTY_DATES, INTERESTS, PRIVATE_STEP_FIELDS, privateRequestSchema, toTravelDates, type PrivateRequestValues } from "../schemas"
import { DatePreferenceField } from "./date-preference-field"

const STEPS = ["Tanggal", "Ukuran grup", "Kebutuhan khusus", "Kontak"]

interface FlowProps {
  initialCatalog: PublicCatalog
  initialSettings: Settings["booking"]
}

/** Reads the slug and ?peserta=; must sit inside <Suspense>. */
export function PrivateRequestRoute(props: FlowProps) {
  const { slug } = useParams<{ slug: string }>()
  const size = Number(useSearchParams().get("peserta"))
  return <PrivateRequestFlow {...props} slug={slug} initialSize={Number.isInteger(size) && size > 0 ? size : null} />
}

function PrivateRequestFlow({ slug, initialSize, initialCatalog }: FlowProps & { slug: string; initialSize: number | null }) {
  const router = useRouter()
  const today = useToday()
  const { packages, destinations, live } = usePublicCatalog(initialCatalog)
  const pkg = packages.find((p) => p.slug === slug)
  const [step, setStep] = useState(0)
  const [pending, setPending] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<PrivateRequestValues>({
    resolver: zodResolver(privateRequestSchema),
    mode: "onTouched",
    defaultValues: { dates: EMPTY_DATES, groupSize: initialSize ?? 2, interests: [], message: "", contact: EMPTY_CONTACT, agree: false },
  })
  const { control, register, formState, setValue, getValues } = form
  const errors = formState.errors
  const dates = useWatch({ control, name: "dates" })
  const groupSize = useWatch({ control, name: "groupSize" })
  const interests = useWatch({ control, name: "interests" })

  // Open trips are booked directly.
  useEffect(() => {
    if (pkg && pkg.tripType === "open") router.replace(`/paket/${pkg.slug}/pesan`)
  }, [pkg, router])

  if (!pkg) {
    if (!live) return <FlowSkeleton />
    return <NotFoundState title="Paket tidak ditemukan" description="Paket ini tidak lagi tersedia." backHref="/paket?jenis=private" backLabel="Lihat private trip" />
  }
  if (pkg.tripType === "open") return <FlowSkeleton />

  const destination = destinations.find((d) => d.id === pkg.destinationId)
  const size = Math.min(pkg.groupSize.max, Math.max(pkg.groupSize.min, groupSize))
  const tier = pkg.pricing.kind === "tiered" ? tierFor(pkg.pricing.tiers, size) : undefined

  const goNext = async () => {
    setSubmitError(null)
    if (await form.trigger([...PRIVATE_STEP_FIELDS[step]])) setStep((s) => s + 1)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setPending(true)
    setSubmitError(null)
    const result = await submitWebsiteInquiry({
      type: "private",
      contact: values.contact,
      packageId: pkg.id,
      travelDates: toTravelDates(values.dates),
      durationDays: pkg.durationDays,
      groupSize: size,
      interests: values.interests as Interest[],
      message: values.message,
    })
    if (result.ok) {
      toast.success("Permintaan terkirim", { description: `Kode permintaan ${result.data.code}` })
      router.push(`/konfirmasi/permintaan/${result.data.code}`)
      return
    }
    setPending(false)
    setSubmitError(result.error.message)
  })

  return (
    <FlowShell
      backHref={`/paket/${pkg.slug}`}
      backLabel="Kembali ke paket"
      eyebrow="Ajukan private trip"
      title={pkg.title}
      steps={STEPS}
      current={step}
      summary={
        <SummaryCard>
          <div className="flex gap-4">
            <div className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-[2px] bg-muted">
              <SmartImage mediaId={pkg.coverMediaId} fill sizes="96px" />
            </div>
            <div className="min-w-0">
              <p className="eyebrow text-muted-foreground">
                {destination?.name} · {formatDuration(pkg.durationDays, pkg.durationNights)}
              </p>
              <p className="mt-1 font-semibold text-balance text-ocean-900">{pkg.title}</p>
            </div>
          </div>
          <dl className="mt-5 space-y-2.5 border-t border-border pt-5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Tanggal</dt>
              <dd className="text-right font-medium">
                {dates.kind === "flexible" ? (dates.month ? formatTravelDates(toTravelDates(dates)) : "Fleksibel") : dates.startDate ? formatTravelDates(toTravelDates(dates)) : "Belum dipilih"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Peserta</dt>
              <dd className="font-medium tabular-nums">{size} orang</dd>
            </div>
            {tier && (
              <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
                <dt className="font-semibold">Estimasi total</dt>
                <dd className="text-right">
                  <span className="block text-xl font-semibold text-ocean-900 tabular-nums">{formatIDR(tier.pricePerPax * size)}</span>
                  <span className="text-xs text-muted-foreground">{formatIDR(tier.pricePerPax)} per orang</span>
                </dd>
              </div>
            )}
          </dl>
          <p className="mt-5 rounded-md bg-muted px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            Ini permintaan, bukan pemesanan. Harga final dan jadwal pembayaran tercantum di penawaran yang kami kirim setelah ketersediaan dicek.
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
            <StepHeading title="Kapan Anda ingin berangkat?" description={`Perjalanan ${formatDuration(pkg.durationDays, pkg.durationNights, "long")}, eksklusif untuk grup Anda.`} />
            <Controller
              control={control}
              name="dates"
              render={({ field }) => <DatePreferenceField value={field.value} onChange={field.onChange} mode="exact" today={today} errors={errors.dates} />}
            />
          </section>
        )}

        {step === 1 && (
          <section>
            <StepHeading title="Berapa orang dalam grup Anda?" description={`Paket ini untuk ${pkg.groupSize.min}–${pkg.groupSize.max} orang. Harga per orang turun untuk grup yang lebih besar.`} />
            <div className="flex flex-col gap-6 rounded-[4px] border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Ukuran grup</p>
                <p className="text-sm text-muted-foreground">{tier ? `${formatIDR(tier.pricePerPax)} per orang` : "Harga sesuai penawaran"}</p>
              </div>
              <QuantityStepper value={size} min={pkg.groupSize.min} max={pkg.groupSize.max} onChange={(n) => setValue("groupSize", n)} label="Ukuran grup" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Grup lebih besar dari {pkg.groupSize.max} orang?{" "}
              <Link href={`/custom-trip?dari=${pkg.slug}`} className="font-semibold text-lagoon-700 underline underline-offset-4">
                Ajukan sebagai custom trip
              </Link>
              .
            </p>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-8">
            <StepHeading title="Ada kebutuhan khusus?" description="Semua opsional. Informasi ini membantu kami menyiapkan penawaran yang lebih tepat." />
            <FieldGroup legend="Yang ingin Anda utamakan">
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((interest) => (
                  <ChipToggle
                    key={interest}
                    pressed={interests.includes(interest)}
                    onPressedChange={(on) =>
                      setValue("interests", on ? [...getValues("interests"), interest] : getValues("interests").filter((i) => i !== interest))
                    }
                  >
                    {INTEREST_LABEL[interest]}
                  </ChipToggle>
                ))}
              </div>
            </FieldGroup>
            <Field
              label="Kebutuhan khusus"
              optional
              error={errors.message?.message}
              description="Misalnya ada lansia atau anak kecil, pantangan makanan, perayaan ulang tahun, atau tipe kamar yang diinginkan."
            >
              {(c) => <Textarea {...c} {...register("message")} rows={5} />}
            </Field>
          </section>
        )}

        {step === 3 && (
          <section>
            <StepHeading title="Ke mana penawaran dikirim?" description="Tim kami menghubungi Anda dalam 1 hari kerja (simulasi)." />
            <DemoNotice className="mb-6">
              Situs demo: gunakan data fiktif.{" "}
              <button type="button" onClick={() => setValue("contact", sampleContact(), { shouldValidate: true })} className="font-semibold underline underline-offset-2">
                Isi data contoh
              </button>
            </DemoNotice>
            <ContactFields register={(field) => register(`contact.${field}`)} errors={errors.contact} />
            <label className="mt-6 flex items-start gap-3 text-sm leading-relaxed">
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
